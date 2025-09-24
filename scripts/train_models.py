#!/usr/bin/env python3
"""
Simple training script to train fraud detection models.
"""

import argparse
import pandas as pd
import numpy as np
import sys
import os
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fraud_detection.models.trainer import ModelTrainer
from fraud_detection.feature_engineering import FeatureEngineer
from fraud_detection.schemas import ExpenseIn, ParticipantInfo


def load_training_data(csv_path: str) -> tuple:
    """Load and preprocess training data from CSV."""
    print(f"Loading training data from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    expenses = []
    labels = []
    
    for _, row in df.iterrows():
        try:
            # Parse participant IDs and amounts from string representation
            participant_ids = eval(row['participant_ids'])
            amounts = eval(row['amounts'])
            
            # Create participants
            participants = []
            for pid, amount in zip(participant_ids, amounts):
                participants.append(ParticipantInfo(user_id=str(pid), amount=float(amount)))
            
            # Create expense
            expense = ExpenseIn(
                expense_id=row['expense_id'],
                group_id=row['group_id'],
                payer_id=row['payer_id'],
                participants=participants,
                amount=float(row['amount']),
                currency=row['currency'],
                merchant=row.get('merchant'),
                category=row.get('category'),
                timestamp=row['timestamp']
            )
            
            expenses.append(expense)
            labels.append(int(row['is_fraud']))
            
        except Exception as e:
            print(f"Warning: Skipping invalid row {_}: {e}")
            continue
    
    print(f"Loaded {len(expenses)} valid expenses")
    return expenses, labels


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train fraud detection models')
    parser.add_argument('--data', '-d', default='data/training_data.csv', help='Training data CSV path')
    parser.add_argument('--models', '-m', nargs='+', default=['isolation_forest'], 
                       choices=['isolation_forest', 'autoencoder'], help='Models to train')
    
    args = parser.parse_args()
    
    try:
        # Load training data
        expenses, labels = load_training_data(args.data)
        
        if len(expenses) == 0:
            print("No valid training data found!")
            return
        
        # Convert to DataFrame format expected by trainer
        # For now, let's load the CSV directly and let the trainer handle it
        df = pd.read_csv(args.data)
        print(f"Loaded DataFrame with {len(df)} rows")
        
        # Initialize trainer
        trainer = ModelTrainer()
        
        # Train each model
        print(f"Training models: {args.models}")
        all_results = {}
        
        for model_type in args.models:
            print(f"\nTraining {model_type}...")
            results = trainer.train(
                training_data=df,
                model_type=model_type
            )
            all_results[model_type] = results
        
        print("Training completed!")
        print("Results:")
        for model_name, results in all_results.items():
            print(f"  {model_name}:")
            if 'metrics' in results:
                for metric, value in results['metrics'].items():
                    print(f"    {metric}: {value:.4f}")
            else:
                print(f"    Success: {results.get('success', False)}")
        
        # Test a sample prediction
        if expenses:
            print("\nTesting sample prediction...")
            # Reload the ensemble model after training
            trainer.ensemble_model = trainer.create_ensemble()
            if trainer.ensemble_model:
                # Extract features for the sample expense
                fe = trainer.feature_engineer
                features = fe.extract_features(expenses[0])
                feature_vector = fe.features_to_vector(features)
                prediction = trainer.ensemble_model.predict_single(expenses[0], features, feature_vector)
                print(f"Sample prediction: {prediction}")
            else:
                print("No trained ensemble model available for testing")
        
    except Exception as e:
        print(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
