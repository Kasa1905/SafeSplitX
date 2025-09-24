#!/usr/bin/env python3
"""
Generate sample training data for fraud detection model training.
"""

import argparse
import random
import csv
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any


def generate_sample_expense(is_fraud: bool = False) -> Dict[str, Any]:
    """Generate a single sample expense."""
    expense_id = f"exp_{random.randint(10000, 99999)}"
    group_id = f"group_{random.randint(100, 999)}"
    payer_id = f"user_{random.randint(1000, 9999)}"
    
    # Generate participants
    num_participants = random.randint(2, 6)
    participants = []
    participant_ids = []
    
    # Always include the payer
    participants.append(payer_id)
    participant_ids.append(payer_id)
    
    # Add other participants
    for _ in range(num_participants - 1):
        participant_id = f"user_{random.randint(1000, 9999)}"
        if participant_id not in participant_ids:
            participants.append(participant_id)
            participant_ids.append(participant_id)
    
    if is_fraud:
        # Generate fraudulent patterns
        if random.random() < 0.3:  # Excessive amount
            total_amount = random.uniform(5000, 50000)
        else:
            total_amount = random.uniform(10, 2000)
            
        if random.random() < 0.2:  # Amount mismatch
            # Generate participants with amounts that don't match total
            amounts = [random.uniform(5, total_amount/2) for _ in participants]
        else:
            # Generate normal split
            amounts = []
            remaining = total_amount
            for i in range(len(participants) - 1):
                amount = random.uniform(remaining * 0.1, remaining * 0.4)
                amounts.append(amount)
                remaining -= amount
            amounts.append(remaining)
        
        # Suspicious merchants
        merchants = ["ATM", "CASH", "Unknown", "Venmo", "PayPal", "Wire Transfer"]
        merchant = random.choice(merchants)
        
        # Suspicious times (midnight or late night)
        if random.random() < 0.4:
            hour = random.choice([0, 1, 2, 3, 4, 23])
        else:
            hour = random.randint(0, 23)
            
        # Weekend late nights
        if random.random() < 0.3:
            # Saturday or Sunday
            weekday = random.choice([5, 6])  # Saturday=5, Sunday=6
        else:
            weekday = random.randint(0, 6)
            
    else:
        # Generate normal expenses
        total_amount = random.uniform(5, 500)
        
        # Generate normal split
        amounts = []
        remaining = total_amount
        for i in range(len(participants) - 1):
            amount = remaining / (len(participants) - i) * random.uniform(0.8, 1.2)
            amount = min(amount, remaining - 0.01 * (len(participants) - i - 1))
            amounts.append(amount)
            remaining -= amount
        amounts.append(remaining)
        
        # Normal merchants
        merchants = [
            "Restaurant ABC", "Grocery Store", "Coffee Shop", "Gas Station",
            "Movie Theater", "Pharmacy", "Bookstore", "Hardware Store"
        ]
        merchant = random.choice(merchants)
        
        # Normal business hours
        hour = random.randint(8, 22)
        weekday = random.randint(0, 6)
    
    # Generate timestamp
    base_date = datetime.now() - timedelta(days=random.randint(1, 365))
    base_date = base_date.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
    
    # Adjust to desired weekday
    days_diff = weekday - base_date.weekday()
    base_date += timedelta(days=days_diff)
    
    # Categories
    categories = ["food", "transport", "entertainment", "shopping", "bills", "other"]
    category = random.choice(categories)
    
    # Currencies
    currencies = ["USD", "EUR", "GBP", "CAD", "AUD"]
    currency = random.choice(currencies)
    
    return {
        "expense_id": expense_id,
        "group_id": group_id,
        "payer_id": payer_id,
        "participant_ids": participant_ids,
        "amounts": amounts,
        "total_amount": total_amount,
        "currency": currency,
        "merchant": merchant,
        "category": category,
        "timestamp": base_date.isoformat() + "Z",
        "is_fraud": int(is_fraud)
    }


def generate_training_data(num_samples: int, fraud_ratio: float = 0.1) -> List[Dict[str, Any]]:
    """Generate training dataset."""
    data = []
    num_fraud = int(num_samples * fraud_ratio)
    num_normal = num_samples - num_fraud
    
    print(f"Generating {num_normal} normal expenses and {num_fraud} fraudulent expenses...")
    
    # Generate normal expenses
    for _ in range(num_normal):
        data.append(generate_sample_expense(is_fraud=False))
    
    # Generate fraudulent expenses
    for _ in range(num_fraud):
        data.append(generate_sample_expense(is_fraud=True))
    
    # Shuffle the data
    random.shuffle(data)
    
    return data


def save_to_csv(data: List[Dict[str, Any]], output_path: str):
    """Save data to CSV file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'expense_id', 'group_id', 'payer_id', 'participant_ids', 'amounts',
            'amount', 'currency', 'merchant', 'category', 'timestamp', 'is_fraud', 'num_participants'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in data:
            # Convert lists to string representation and rename total_amount to amount
            row_copy = row.copy()
            row_copy['participant_ids'] = str(row['participant_ids'])
            row_copy['amounts'] = str(row['amounts'])
            row_copy['amount'] = row_copy.pop('total_amount')  # Rename for trainer compatibility
            row_copy['num_participants'] = len(eval(str(row['participant_ids'])))
            writer.writerow(row_copy)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Generate sample training data for fraud detection')
    parser.add_argument('--output', '-o', required=True, help='Output CSV file path')
    parser.add_argument('--samples', '-n', type=int, default=1000, help='Number of samples to generate')
    parser.add_argument('--fraud-ratio', '-f', type=float, default=0.1, help='Ratio of fraudulent samples (0.0-1.0)')
    parser.add_argument('--seed', '-s', type=int, default=42, help='Random seed for reproducibility')
    
    args = parser.parse_args()
    
    # Set random seed for reproducibility
    random.seed(args.seed)
    
    print(f"Generating {args.samples} samples with {args.fraud_ratio:.1%} fraud ratio...")
    
    # Generate data
    data = generate_training_data(args.samples, args.fraud_ratio)
    
    # Save to CSV
    save_to_csv(data, args.output)
    
    print(f"Training data saved to: {args.output}")
    print(f"Total samples: {len(data)}")
    print(f"Fraudulent samples: {sum(1 for d in data if d['is_fraud'])}")
    print(f"Normal samples: {sum(1 for d in data if not d['is_fraud'])}")


if __name__ == "__main__":
    main()
