#!/usr/bin/env python3
"""
Command-line interface for training fraud detection models.
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from fraud_detection.models.trainer import ModelTrainer
from fraud_detection.data.sample_data_generator import SampleDataGenerator
from fraud_detection.utils.logging_config import setup_logging


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Train fraud detection models',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train.py                           # Train default isolation forest model
  python train.py --model-type autoencoder  # Train autoencoder model  
  python train.py --samples 5000 --fraud-rate 0.1  # Custom training data
  python train.py --data-file data/my_data.csv      # Use existing data file
        """
    )
    
    # Model arguments
    parser.add_argument(
        '--model-type', 
        choices=['isolation_forest', 'autoencoder'], 
        default='isolation_forest',
        help='Type of model to train (default: isolation_forest)'
    )
    parser.add_argument(
        '--model-dir',
        default='./models',
        help='Directory to save trained models (default: ./models)'
    )
    
    # Data arguments
    parser.add_argument(
        '--data-file',
        help='CSV file with training data (if not provided, synthetic data will be generated)'
    )
    parser.add_argument(
        '--samples',
        type=int,
        default=10000,
        help='Number of synthetic samples to generate (default: 10000)'
    )
    parser.add_argument(
        '--fraud-rate',
        type=float,
        default=0.05,
        help='Fraud rate for synthetic data (default: 0.05)'
    )
    
    # Training arguments
    parser.add_argument(
        '--validation-split',
        type=float,
        default=0.2,
        help='Fraction of data for validation (default: 0.2)'
    )
    parser.add_argument(
        '--n-estimators',
        type=int,
        default=100,
        help='Number of estimators for isolation forest (default: 100)'
    )
    parser.add_argument(
        '--contamination',
        type=float,
        default=0.1,
        help='Contamination rate for isolation forest (default: 0.1)'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=100,
        help='Number of epochs for autoencoder (default: 100)'
    )
    parser.add_argument(
        '--learning-rate',
        type=float,
        default=0.001,
        help='Learning rate for autoencoder (default: 0.001)'
    )
    
    # Logging arguments
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Logging level (default: INFO)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = 'DEBUG' if args.verbose else args.log_level
    setup_logging(log_level=log_level)
    logger = logging.getLogger('fraud_detection.train')
    
    try:
        logger.info("Starting fraud detection model training")
        logger.info(f"Model type: {args.model_type}")
        logger.info(f"Model directory: {args.model_dir}")
        
        # Initialize trainer
        trainer = ModelTrainer(args.model_dir)
        
        # Load or generate training data
        if args.data_file:
            logger.info(f"Loading training data from {args.data_file}")
            import pandas as pd
            training_data = pd.read_csv(args.data_file)
            logger.info(f"Loaded {len(training_data)} samples from file")
        else:
            logger.info(f"Generating {args.samples} synthetic samples with {args.fraud_rate:.1%} fraud rate")
            generator = SampleDataGenerator()
            training_data = generator.generate_dataset(
                n_samples=args.samples,
                fraud_rate=args.fraud_rate
            )
            
            # Save generated data for reference
            data_file = generator.save_to_csv(training_data, 'training_data.csv')
            logger.info(f"Synthetic training data saved to {data_file}")
        
        # Prepare training parameters
        if args.model_type == 'isolation_forest':
            params = {
                'n_estimators': args.n_estimators,
                'contamination': args.contamination,
                'random_state': 42,
                'n_jobs': -1
            }
        elif args.model_type == 'autoencoder':
            params = {
                'epochs': args.epochs,
                'learning_rate': args.learning_rate,
                'batch_size': 32,
                'hidden_dims': None  # Will use default
            }
        else:
            params = {}
        
        logger.info(f"Training parameters: {params}")
        
        # Train model
        logger.info("Starting model training...")
        results = trainer.train(
            training_data=training_data,
            model_type=args.model_type,
            params=params,
            validation_split=args.validation_split
        )
        
        if results['success']:
            logger.info("Training completed successfully!")
            logger.info(f"Model version: {results['model_version']}")
            logger.info(f"Model path: {results['model_path']}")
            
            # Print metrics
            metrics = results['metrics']
            logger.info("Training metrics:")
            for metric, value in metrics.items():
                if isinstance(value, float):
                    logger.info(f"  {metric}: {value:.4f}")
                else:
                    logger.info(f"  {metric}: {value}")
            
            # Test the trained model
            logger.info("Testing trained model...")
            test_model(trainer, args.model_type)
            
            print("\n" + "="*60)
            print("TRAINING COMPLETED SUCCESSFULLY")
            print("="*60)
            print(f"Model Type: {args.model_type}")
            print(f"Version: {results['model_version']}")
            print(f"Location: {results['model_path']}")
            print("\nKey Metrics:")
            for metric in ['accuracy', 'precision', 'recall', 'f1_score']:
                if metric in metrics:
                    print(f"  {metric.replace('_', '').title()}: {metrics[metric]:.4f}")
            print("\nTo use this model:")
            print("  python -m uvicorn fraud_detection.api.main:app --reload")
            print("="*60)
            
        else:
            logger.error("Training failed!")
            logger.error(f"Error: {results.get('error', 'Unknown error')}")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Training interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Training failed with error: {str(e)}", exc_info=True)
        sys.exit(1)


def test_model(trainer: ModelTrainer, model_type: str):
    """
    Test the trained model with a few sample predictions.
    
    Args:
        trainer: Model trainer instance
        model_type: Type of model that was trained
    """
    try:
        logger = logging.getLogger('fraud_detection.train')
        
        # Load the trained model
        ensemble = trainer.create_ensemble(model_type)
        
        # Generate a few test samples
        generator = SampleDataGenerator()
        test_data = generator.generate_dataset(n_samples=5, fraud_rate=0.6)  # Higher fraud rate for testing
        
        logger.info("Testing model with sample predictions:")
        
        for idx, row in test_data.iterrows():
            try:
                # Convert to expense format
                from fraud_detection.schemas import ExpenseIn, ParticipantInfo
                
                participants = [
                    ParticipantInfo(user_id=f"test_user_{i}", amount=row['amount']/row['num_participants'])
                    for i in range(int(row['num_participants']))
                ]
                
                expense = ExpenseIn(
                    expense_id=row['expense_id'],
                    group_id=row['group_id'],
                    payer_id=participants[0].user_id,
                    participants=participants,
                    amount=row['amount'],
                    currency=row['currency'],
                    merchant=row['merchant'],
                    category=row['category'],
                    timestamp=row['timestamp']
                )
                
                # Extract features
                features = trainer.feature_engineer.extract_features(expense)
                feature_vector = trainer.feature_engineer.features_to_vector(features)
                
                # Make prediction
                result = ensemble.predict_single(expense, features, feature_vector)
                
                actual_label = "FRAUD" if row['is_fraud'] else "NORMAL"
                predicted_label = "SUSPICIOUS" if result['is_suspicious'] else "NORMAL"
                
                logger.info(f"  {expense.expense_id}: {actual_label} -> {predicted_label} "
                           f"(score: {result['anomaly_score']:.3f})")
                
            except Exception as e:
                logger.warning(f"  Error testing sample {idx}: {str(e)}")
                
    except Exception as e:
        logger.warning(f"Model testing failed: {str(e)}")


if __name__ == "__main__":
    main()
