import { forwardRef } from 'react';

const Card = forwardRef(({
  children,
  className = '',
  hover = false,
  padding = true,
  ...props
}, ref) => {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm';
  const hoverClasses = hover ? 'hover:shadow-md transition-shadow duration-200' : '';
  const paddingClasses = padding ? 'p-6' : '';
  
  const classes = `${baseClasses} ${hoverClasses} ${paddingClasses} ${className}`;
  
  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;