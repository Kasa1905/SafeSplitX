# SplitSafeX Algorithms Documentation

This document provides comprehensive documentation for the SplitSafeX algorithms module, which implements fair-split calculation algorithms for expense sharing and settlement.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Algorithms](#algorithms)
6. [Validation](#validation)
7. [Utilities](#utilities)
8. [Examples](#examples)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

## Overview

The SplitSafeX algorithms module provides three primary splitting methods for fairly dividing expenses among participants:

- **Equal Split**: Divides amounts equally among all participants
- **Weighted Split**: Distributes amounts based on participant weights
- **Percentage Split**: Allocates amounts according to specified percentages

All algorithms are designed to handle currency precision, rounding issues, and edge cases while maintaining mathematical accuracy.

## Installation

```bash
npm install @splitsafex/algorithms
```

Or if using within the SplitSafeX monorepo:

```bash
cd algorithms
npm install
```

## Quick Start

```javascript
const { equalSplit, weightedSplit, percentageSplit } = require('@splitsafex/algorithms');

// Equal split example
const participants = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' }
];

const equalResult = equalSplit(100, participants, 'USD');
console.log(equalResult);
// Output: { success: true, splits: [{ id: '1', name: 'Alice', amount: 33.34 }, ...] }

// Weighted split example (participants include weight property)
const weightedParticipants = [
  { id: '1', name: 'Alice', weight: 2 },
  { id: '2', name: 'Bob', weight: 3 },
  { id: '3', name: 'Charlie', weight: 5 }
];
const weightedResult = weightedSplit(100, weightedParticipants, 'USD');

// Percentage split example (participants include percentage property)
const percentageParticipants = [
  { id: '1', name: 'Alice', percentage: 30 },
  { id: '2', name: 'Bob', percentage: 30 },
  { id: '3', name: 'Charlie', percentage: 40 }
];
const percentageResult = percentageSplit(100, percentageParticipants, 'USD');
```

## API Reference

### Core Functions

#### `equalSplit(amount, participants, currency = 'USD', options = {})`

Divides an amount equally among participants.

**Parameters:**
- `amount` (number): The total amount to split
- `participants` (Array): Array of participant objects with `id` and `name`
- `currency` (string, optional): Currency code (USD, EUR, JPY). Default: 'USD'
- `options` (object, optional): Additional options

**Returns:**
- Object with `success` boolean and either `splits` array or `error` message

**Example:**
```javascript
const result = equalSplit(100, [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' }
], 'USD');
// Result: { success: true, splits: [{ id: '1', name: 'Alice', amount: 50.00 }, { id: '2', name: 'Bob', amount: 50.00 }] }
```

#### `weightedSplit(amount, participants, currency = 'USD')`

Distributes an amount based on participant weights.

**Parameters:**
- `amount` (number): The total amount to split
- `participants` (Array): Array of participant objects with `id`, `name`, and `weight` properties
- `currency` (string, optional): Currency code. Default: 'USD'

**Returns:**
- Object with `success` boolean and either `splits` array or `error` message

**Example:**
```javascript
const result = weightedSplit(100, [
  { id: '1', name: 'Alice', weight: 1 },
  { id: '2', name: 'Bob', weight: 3 }
], 'USD');
// Result: Alice gets 25%, Bob gets 75%
```

#### `percentageSplit(amount, participants, currency = 'USD')`

Allocates an amount according to specified percentages.

**Parameters:**
- `amount` (number): The total amount to split
- `participants` (Array): Array of participant objects with `id`, `name`, and `percentage` properties
- `currency` (string, optional): Currency code. Default: 'USD'

**Returns:**
- Object with `success` boolean and either `splits` array or `error` message

**Example:**
```javascript
const result = percentageSplit(100, [
  { id: '1', name: 'Alice', percentage: 60 },
  { id: '2', name: 'Bob', percentage: 40 }
], 'USD');
// Result: Alice gets $60.00, Bob gets $40.00
```

## Algorithms

### Equal Split Algorithm

The equal split algorithm divides the total amount evenly among all participants. When the division results in remainders due to currency precision, the algorithm distributes the remainder fairly:

1. Calculate base amount per participant
2. Round to currency precision
3. Distribute any remainder starting with the first participants

**Mathematical Approach:**
```
base_amount = floor(total_amount / participant_count * 100) / 100
remainder = total_amount - (base_amount * participant_count)
```

### Weighted Split Algorithm

The weighted split algorithm distributes amounts proportionally based on participant weights:

1. Normalize weights to percentages
2. Calculate each participant's share
3. Apply currency rounding
4. Distribute remainder proportionally

**Mathematical Approach:**
```
normalized_weight = weight / sum_of_all_weights
participant_share = total_amount * normalized_weight
```

### Percentage Split Algorithm

The percentage split algorithm allocates amounts based on exact percentages:

1. Validate percentages sum to 100%
2. Calculate each participant's share
3. Apply currency rounding
4. Distribute remainder to maintain total

**Mathematical Approach:**
```
participant_share = total_amount * (percentage / 100)
```

## Validation

The algorithms module includes comprehensive input validation:

### Amount Validation
- Must be a positive number
- Cannot be null, undefined, NaN, or Infinity
- Must not exceed maximum allowed value (1,000,000,000)
- Must not have more than 4 decimal places

### Participant Validation
- Must be an array with at least one participant
- Each participant must have `id` and `name` properties
- IDs must be unique
- Names cannot be empty
- Maximum 1000 participants allowed

### Weight Validation
- Must be an array of positive numbers
- Each weight must be greater than zero
- Weights cannot be NaN or Infinity
- Must match the number of participants

### Percentage Validation
- Must be an array of numbers between 0 and 100
- Total must equal exactly 100%
- Cannot have more than 2 decimal places
- Must match the number of participants

## Utilities

### Currency Formatting
```javascript
const { formatCurrency } = require('@splitsafex/algorithms/utils');

formatCurrency(1234.56, 'USD'); // "$1,234.56"
formatCurrency(1234.56, 'EUR'); // "€1,234.56"
formatCurrency(1234.56, 'JPY'); // "¥1,235"
```

### Precision Handling
```javascript
const { roundToPrecision, validateCurrencyPrecision } = require('@splitsafex/algorithms/utils');

roundToPrecision(3.14159, 2); // 3.14
validateCurrencyPrecision(1.23, 'USD'); // true
validateCurrencyPrecision(1.234, 'USD'); // false
```

### Remainder Distribution
```javascript
const { distributeRemainder } = require('@splitsafex/algorithms/utils');

const shares = [10.00, 20.00, 30.00];
const remainder = 0.03;
distributeRemainder(shares, remainder); // [10.01, 20.01, 30.01]
```

## Examples

### Real-World Scenarios

#### Restaurant Bill Split
```javascript
// Equal split of a restaurant bill
const restaurantBill = equalSplit(127.85, [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' }
], 'USD');

console.log(restaurantBill);
// Output: Each person pays $42.62, $42.62, $42.61 (total: $127.85)
```

#### Rent Split by Room Size
```javascript
// Weighted split based on room size
const rentSplit = weightedSplit(3000, [
  { id: 'roommate1', name: 'Alice (Large Room)', weight: 3 },
  { id: 'roommate2', name: 'Bob (Medium Room)', weight: 2 },
  { id: 'roommate3', name: 'Charlie (Small Room)', weight: 1 }
], 'USD'); // Weights based on room size

// Alice pays 50%, Bob pays 33.33%, Charlie pays 16.67%
```

#### Investment Split by Ownership
```javascript
// Percentage split based on ownership stakes
const investmentSplit = percentageSplit(50000, [
  { id: 'investor1', name: 'Primary Investor', percentage: 60 },
  { id: 'investor2', name: 'Secondary Investor', percentage: 30 },
  { id: 'investor3', name: 'Minor Investor', percentage: 10 }
], 'USD');

// $30,000, $15,000, $5,000 respectively
```

### Multi-Currency Examples

#### European Trip Expense
```javascript
const tripExpense = equalSplit(250.75, [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' }
], 'EUR');

// Each pays €83.58, €83.58, €83.59
```

#### Japanese Dinner
```javascript
const dinnerBill = weightedSplit(15000, [
  { id: '1', name: 'Taro', weight: 1 },
  { id: '2', name: 'Hanako', weight: 1 }
], 'JPY');

// Each pays ¥7,500 (JPY has no decimals)
```

## Error Handling

All algorithms return consistent error objects:

```javascript
{
  success: false,
  error: "Descriptive error message"
}
```

Common error scenarios:

### Invalid Amount
```javascript
equalSplit(-50, participants); 
// { success: false, error: "Amount must be a positive number greater than zero" }
```

### Invalid Participants
```javascript
equalSplit(100, []);
// { success: false, error: "At least one participant is required" }
```

### Percentage Sum Error
```javascript
percentageSplit(100, participants, [50, 30]); // Only adds to 80%
// { success: false, error: "Percentages must equal 100%" }
```

## Testing

The algorithms module includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Categories

1. **Basic Functionality Tests**
   - Correct calculations for each algorithm
   - Currency handling
   - Precision maintenance

2. **Edge Case Tests**
   - Small amounts (< $1)
   - Large amounts (> $1,000,000)
   - Single participant
   - Maximum participants (1000)

3. **Error Handling Tests**
   - Invalid inputs
   - Boundary conditions
   - Type validation

4. **Currency Tests**
   - Multi-currency support
   - Precision rules (USD: 2 decimals, JPY: 0 decimals)
   - Formatting validation

5. **Rounding Tests**
   - Remainder distribution
   - Precision loss prevention
   - Total preservation

## Currency Support

### Supported Currencies

| Currency | Code | Decimals | Symbol | Example |
|----------|------|----------|--------|---------|
| US Dollar | USD | 2 | $ | $123.45 |
| Euro | EUR | 2 | € | €123.45 |
| Japanese Yen | JPY | 0 | ¥ | ¥12345 |

### Adding New Currencies

To add support for additional currencies, update the currency configuration in `utils.js`:

```javascript
const CURRENCY_CONFIG = {
  'USD': { decimals: 2, symbol: '$' },
  'EUR': { decimals: 2, symbol: '€' },
  'JPY': { decimals: 0, symbol: '¥' },
  'GBP': { decimals: 2, symbol: '£' }, // New currency
  // Add more currencies here
};
```

## Performance Considerations

- All algorithms run in O(n) time complexity where n is the number of participants
- Memory usage is minimal and proportional to the number of participants
- No external API calls or asynchronous operations
- Suitable for real-time calculations with hundreds of participants

## Integration Guidelines

### Backend Integration

```javascript
// Express.js route example
app.post('/api/expenses/:id/split', async (req, res) => {
  const { amount, participants, method } = req.body;
  const currency = req.user.defaultCurrency || 'USD';
  
  let result;
  switch (method) {
    case 'equal':
      result = equalSplit(amount, participants, currency);
      break;
    case 'weighted':
      // Participants should include weight property
      result = weightedSplit(amount, participants, currency);
      break;
    case 'percentage':
      // Participants should include percentage property
      result = percentageSplit(amount, participants, currency);
      break;
    default:
      return res.status(400).json({ error: 'Invalid split method' });
  }
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  // Save splits to database and return response
  res.json(result);
});
```

### Frontend Integration

```javascript
// React component example
import { equalSplit } from '@splitsafex/algorithms';

function ExpenseSplitter({ expense, participants }) {
  const [splitResult, setSplitResult] = useState(null);
  
  const handleSplit = () => {
    const result = equalSplit(expense.amount, participants, expense.currency);
    if (result.success) {
      setSplitResult(result.splits);
    } else {
      setError(result.error);
    }
  };
  
  return (
    <div>
      <button onClick={handleSplit}>Calculate Split</button>
      {splitResult && (
        <div>
          {splitResult.map(split => (
            <div key={split.id}>
              {split.name}: {formatCurrency(split.amount, expense.currency)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

1. **Always validate inputs** before calling algorithm functions
2. **Handle errors gracefully** by checking the `success` property
3. **Use appropriate precision** for different currencies
4. **Test edge cases** thoroughly, especially with small amounts
5. **Consider rounding behavior** when dealing with remainders
6. **Validate totals** after splitting to ensure accuracy
7. **Use consistent currency codes** throughout your application

## Troubleshooting

### Common Issues

**Issue: Splits don't add up to original amount**
- Solution: This is expected due to currency rounding. The algorithms ensure the total is preserved by distributing remainders.

**Issue: Percentages validation fails**
- Solution: Ensure percentages sum to exactly 100.00. Use `33.34, 33.33, 33.33` instead of `33.33, 33.33, 33.33`.

**Issue: JPY amounts have decimals**
- Solution: JPY doesn't support decimals. The algorithm will round to whole numbers automatically.

**Issue: Performance with large participant lists**
- Solution: Consider pagination or chunking for more than 1000 participants.

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions, please contact the SplitSafeX development team or create an issue in the project repository.