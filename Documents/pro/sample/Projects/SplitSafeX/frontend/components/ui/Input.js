import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
  const normalClasses = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-primary-500 focus:border-primary-500';
  const errorClasses = 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 placeholder-red-400 focus:ring-red-500 focus:border-red-500';
  
  const inputClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${className}`;
  
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;