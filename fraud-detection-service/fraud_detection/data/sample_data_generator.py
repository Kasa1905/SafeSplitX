"""
Sample data generator for training and testing fraud detection models.
"""

import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random
import os

logger = logging.getLogger(__name__)


class SampleDataGenerator:
    """
    Generates synthetic expense data for train        if is_fraud:
            # Fraudulent transactions more likely at odd hours
            probs = [0.08]*6 + [0.02]*6 + [0.02]*6 + [0.04]*6  # Late night/early morning peak
            probs = np.array(probs) / np.sum(probs)  # Normalize to sum to 1
            hour = np.random.choice(list(range(24)), p=probs)
            minute = np.random.randint(0, 60)
        else:
            # Normal transactions mostly during business hours
            probs = [0.01]*6 + [0.05]*6 + [0.15]*6 + [0.05]*6  # Peak 6-18
            probs = np.array(probs) / np.sum(probs)  # Normalize to sum to 1
            hour = np.random.choice(list(range(24)), p=probs)
            minute = np.random.randint(0, 60)g fraud detection models.
    """
    
    def __init__(self, seed: int = 42):
        """
        Initialize sample data generator.
        
        Args:
            seed: Random seed for reproducibility
        """
        self.seed = seed
        np.random.seed(seed)
        random.seed(seed)
        
        # Configuration for realistic data generation
        self.merchants = [
            'Restaurant ABC', 'Grocery Store XYZ', 'Gas Station 123',
            'Coffee Shop DEF', 'Online Store GHI', 'Hotel JKL',
            'Airline MNO', 'Taxi Service PQR', 'Pharmacy STU',
            'Electronics Store VWX', 'Clothing Store YZ'
        ]
        
        self.categories = [
            'food', 'groceries', 'transport', 'accommodation',
            'entertainment', 'utilities', 'healthcare', 'shopping',
            'travel', 'business'
        ]
        
        self.currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
        
        # Fraud patterns configuration
        self.fraud_patterns = {
            'excessive_amount': 0.3,    # 30% of fraud cases
            'rapid_transactions': 0.2,   # 20% of fraud cases
            'unusual_time': 0.15,        # 15% of fraud cases
            'suspicious_merchant': 0.1,  # 10% of fraud cases
            'round_amounts': 0.15,       # 15% of fraud cases
            'other': 0.1                 # 10% other patterns
        }
        
        logger.info("SampleDataGenerator initialized")
    
    def generate_dataset(self, n_samples: int = 10000, fraud_rate: float = 0.05,
                        start_date: datetime = None, end_date: datetime = None) -> pd.DataFrame:
        """
        Generate a complete dataset with normal and fraudulent expenses.
        
        Args:
            n_samples: Total number of samples to generate
            fraud_rate: Fraction of samples that should be fraudulent
            start_date: Start date for expense timestamps
            end_date: End date for expense timestamps
            
        Returns:
            DataFrame with generated expense data
        """
        try:
            logger.info(f"Generating dataset with {n_samples} samples, {fraud_rate:.1%} fraud rate")
            
            if start_date is None:
                start_date = datetime.utcnow() - timedelta(days=365)
            if end_date is None:
                end_date = datetime.utcnow()
            
            # Calculate number of normal and fraud samples
            n_fraud = int(n_samples * fraud_rate)
            n_normal = n_samples - n_fraud
            
            # Generate normal expenses
            normal_expenses = self._generate_normal_expenses(n_normal, start_date, end_date)
            
            # Generate fraudulent expenses
            fraud_expenses = self._generate_fraud_expenses(n_fraud, start_date, end_date)
            
            # Combine and shuffle
            all_expenses = normal_expenses + fraud_expenses
            random.shuffle(all_expenses)
            
            # Convert to DataFrame
            df = pd.DataFrame(all_expenses)
            
            logger.info(f"Generated {len(df)} expenses: {len(normal_expenses)} normal, {len(fraud_expenses)} fraud")
            return df
            
        except Exception as e:
            logger.error(f"Error generating dataset: {str(e)}")
            raise
    
    def _generate_normal_expenses(self, n_samples: int, start_date: datetime,
                                end_date: datetime) -> List[Dict[str, Any]]:
        """
        Generate normal (non-fraudulent) expense data.
        
        Args:
            n_samples: Number of normal samples to generate
            start_date: Start date for timestamps
            end_date: End date for timestamps
            
        Returns:
            List of expense dictionaries
        """
        expenses = []
        
        for i in range(n_samples):
            # Generate realistic expense amounts (log-normal distribution)
            amount = max(5.0, np.random.lognormal(mean=3.0, sigma=1.2))
            amount = round(amount, 2)
            
            # Generate participants (typically 2-4 people)
            num_participants = np.random.choice([2, 3, 4], p=[0.6, 0.3, 0.1])
            participants = []
            
            # Split amount among participants
            base_share = amount / num_participants
            for j in range(num_participants):
                # Add some variation to shares
                share = base_share * np.random.uniform(0.8, 1.2)
                participants.append({
                    'user_id': f'user_{np.random.randint(1, 1001)}',
                    'amount': round(share, 2)
                })
            
            # Adjust to ensure total matches
            total_participant_amount = sum(p['amount'] for p in participants)
            if total_participant_amount != amount:
                participants[0]['amount'] = round(
                    participants[0]['amount'] + (amount - total_participant_amount), 2
                )
            
            # Generate timestamp (business hours bias)
            timestamp = self._generate_realistic_timestamp(start_date, end_date, is_fraud=False)
            
            expense = {
                'expense_id': f'exp_{i}',
                'group_id': f'group_{np.random.randint(1, 101)}',
                'payer_id': participants[0]['user_id'],  # First participant is usually payer
                'participants': participants,
                'amount': amount,
                'currency': np.random.choice(self.currencies, p=[0.7, 0.1, 0.1, 0.05, 0.05]),
                'merchant': np.random.choice(self.merchants),
                'category': np.random.choice(self.categories),
                'timestamp': timestamp.isoformat(),
                'num_participants': num_participants,
                'is_fraud': 0
            }
            
            expenses.append(expense)
        
        return expenses
    
    def _generate_fraud_expenses(self, n_samples: int, start_date: datetime,
                               end_date: datetime) -> List[Dict[str, Any]]:
        """
        Generate fraudulent expense data with various fraud patterns.
        
        Args:
            n_samples: Number of fraud samples to generate
            start_date: Start date for timestamps
            end_date: End date for timestamps
            
        Returns:
            List of fraudulent expense dictionaries
        """
        expenses = []
        
        for i in range(n_samples):
            # Choose fraud pattern
            pattern = np.random.choice(
                list(self.fraud_patterns.keys()),
                p=list(self.fraud_patterns.values())
            )
            
            expense = self._generate_expense_with_pattern(
                expense_id=f'fraud_{i}',
                pattern=pattern,
                start_date=start_date,
                end_date=end_date
            )
            
            expenses.append(expense)
        
        return expenses
    
    def _generate_expense_with_pattern(self, expense_id: str, pattern: str,
                                     start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Generate an expense with a specific fraud pattern.
        
        Args:
            expense_id: Unique expense identifier
            pattern: Fraud pattern to apply
            start_date: Start date for timestamps
            end_date: End date for timestamps
            
        Returns:
            Fraudulent expense dictionary
        """
        base_expense = {
            'expense_id': expense_id,
            'group_id': f'group_{np.random.randint(1, 101)}',
            'is_fraud': 1
        }
        
        if pattern == 'excessive_amount':
            # Generate unusually high amounts
            amount = np.random.uniform(500, 5000)
            base_expense.update({
                'amount': round(amount, 2),
                'merchant': np.random.choice(['Luxury Hotel', 'High-end Restaurant', 'Electronics Store']),
                'category': np.random.choice(['accommodation', 'food', 'shopping']),
                'currency': 'USD'
            })
            
        elif pattern == 'rapid_transactions':
            # Generate multiple transactions in short time
            amount = np.random.uniform(50, 200)
            base_expense.update({
                'amount': round(amount, 2),
                'merchant': np.random.choice(self.merchants),
                'category': np.random.choice(self.categories),
                'currency': 'USD'
            })
            # Timestamp will be generated to cluster with other transactions
            
        elif pattern == 'unusual_time':
            # Generate transactions at unusual hours
            timestamp = self._generate_realistic_timestamp(start_date, end_date, is_fraud=True, unusual_time=True)
            amount = np.random.uniform(20, 150)
            base_expense.update({
                'amount': round(amount, 2),
                'merchant': np.random.choice(self.merchants),
                'category': np.random.choice(self.categories),
                'currency': 'USD',
                'timestamp': timestamp.isoformat()
            })
            
        elif pattern == 'suspicious_merchant':
            # Generate transactions with suspicious merchants
            amount = np.random.uniform(30, 300)
            base_expense.update({
                'amount': round(amount, 2),
                'merchant': np.random.choice(['Cash Advance', 'Unknown Merchant', 'Suspicious Store']),
                'category': 'other',
                'currency': 'USD'
            })
            
        elif pattern == 'round_amounts':
            # Generate suspiciously round amounts
            amount = np.random.choice([100, 200, 250, 300, 500, 1000])
            base_expense.update({
                'amount': float(amount),
                'merchant': np.random.choice(self.merchants),
                'category': np.random.choice(self.categories),
                'currency': 'USD'
            })
            
        else:  # 'other' patterns
            # Generate other suspicious patterns
            amount = np.random.uniform(100, 800)
            base_expense.update({
                'amount': round(amount, 2),
                'merchant': np.random.choice(self.merchants),
                'category': np.random.choice(self.categories),
                'currency': np.random.choice(['EUR', 'GBP'])  # Currency mismatch
            })
        
        # Add common fields if not already set
        if 'timestamp' not in base_expense:
            base_expense['timestamp'] = self._generate_realistic_timestamp(
                start_date, end_date, is_fraud=True
            ).isoformat()
        
        # Generate participants (fraudulent expenses often have fewer or unusual participants)
        num_participants = np.random.choice([1, 2, 8], p=[0.4, 0.4, 0.2])  # 1 person or many people
        participants = []
        
        if num_participants == 1:
            # Single participant (payer not participating)
            participants = [{
                'user_id': f'user_{np.random.randint(1, 1001)}',
                'amount': base_expense['amount']
            }]
            base_expense['payer_id'] = f'user_{np.random.randint(1, 1001)}'  # Different payer
        else:
            # Multiple participants with uneven splits
            total_amount = base_expense['amount']
            base_share = total_amount / num_participants
            
            for j in range(num_participants):
                if j == 0:
                    # First participant gets most of the amount (suspicious)
                    share = total_amount * 0.7
                else:
                    share = (total_amount * 0.3) / (num_participants - 1)
                
                participants.append({
                    'user_id': f'user_{np.random.randint(1, 1001)}',
                    'amount': round(share, 2)
                })
            
            # Adjust to ensure total matches
            total_participant_amount = sum(p['amount'] for p in participants)
            if abs(total_participant_amount - total_amount) > 0.01:
                participants[0]['amount'] = round(
                    participants[0]['amount'] + (total_amount - total_participant_amount), 2
                )
            
            base_expense['payer_id'] = participants[0]['user_id']
        
        base_expense['participants'] = participants
        base_expense['num_participants'] = len(participants)
        
        return base_expense
    
    def _generate_realistic_timestamp(self, start_date: datetime, end_date: datetime,
                                    is_fraud: bool = False, unusual_time: bool = False) -> datetime:
        """
        Generate realistic timestamps with business hour bias.
        
        Args:
            start_date: Start date range
            end_date: End date range
            is_fraud: Whether this is for a fraudulent transaction
            unusual_time: Whether to generate unusual times
            
        Returns:
            Generated timestamp
        """
        # Random date between start and end
        time_between = end_date - start_date
        days_between = time_between.days
        random_days = np.random.randint(0, days_between)
        random_date = start_date + timedelta(days=random_days)
        
        if unusual_time:
            # Generate very early morning or very late hours
            hour = np.random.choice([2, 3, 4, 23, 0, 1])
            minute = np.random.randint(0, 60)
        elif is_fraud:
            # Fraud transactions slightly more likely outside business hours
            probs = [0.02]*6 + [0.08]*6 + [0.12]*6 + [0.08]*6  # Higher prob 6-18
            probs = np.array(probs) / np.sum(probs)  # Normalize to sum to 1
            hour = np.random.choice(list(range(24)), p=probs)
            minute = np.random.randint(0, 60)
        else:
            # Normal transactions mostly during business hours
            probs = [0.01]*6 + [0.05]*6 + [0.15]*6 + [0.05]*6  # Peak 6-18
            probs = np.array(probs) / np.sum(probs)  # Normalize to sum to 1
            hour = np.random.choice(list(range(24)), p=probs)
            minute = np.random.randint(0, 60)
        
        return random_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    def save_to_csv(self, df: pd.DataFrame, filename: str = None) -> str:
        """
        Save generated data to CSV file.
        
        Args:
            df: DataFrame to save
            filename: Output filename (optional)
            
        Returns:
            Path to saved file
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"sample_expenses_{timestamp}.csv"
        
        # Create data directory if it doesn't exist
        data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        filepath = os.path.join(data_dir, filename)
        
        # Convert participants list to JSON string for CSV storage
        df_copy = df.copy()
        df_copy['participants'] = df_copy['participants'].apply(str)
        
        df_copy.to_csv(filepath, index=False)
        
        logger.info(f"Sample data saved to {filepath}")
        return filepath
    
    def generate_and_save(self, n_samples: int = 10000, fraud_rate: float = 0.05,
                         filename: str = None) -> str:
        """
        Generate dataset and save to CSV in one step.
        
        Args:
            n_samples: Number of samples to generate
            fraud_rate: Fraction of fraudulent samples
            filename: Output filename
            
        Returns:
            Path to saved file
        """
        df = self.generate_dataset(n_samples, fraud_rate)
        return self.save_to_csv(df, filename)


def main():
    """CLI entry point for data generation."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate sample fraud detection data')
    parser.add_argument('--samples', type=int, default=10000,
                       help='Number of samples to generate (default: 10000)')
    parser.add_argument('--fraud-rate', type=float, default=0.05,
                       help='Fraud rate (default: 0.05)')
    parser.add_argument('--output', type=str, default=None,
                       help='Output filename (default: auto-generated)')
    parser.add_argument('--seed', type=int, default=42,
                       help='Random seed (default: 42)')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Generate data
    generator = SampleDataGenerator(seed=args.seed)
    filepath = generator.generate_and_save(
        n_samples=args.samples,
        fraud_rate=args.fraud_rate,
        filename=args.output
    )
    
    print(f"Generated {args.samples} samples with {args.fraud_rate:.1%} fraud rate")
    print(f"Data saved to: {filepath}")


if __name__ == "__main__":
    main()
