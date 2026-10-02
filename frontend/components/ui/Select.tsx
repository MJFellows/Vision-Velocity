import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className, ...rest }, ref) => {
    // Always link the label; a select with no visible label is named from its placeholder or first option.
    const autoId = useId();
    const selectId = id || rest.name || autoId;
    const fallbackName = !label && !rest['aria-label'] && !rest['aria-labelledby'] ? placeholder || options[0]?.label || 'Choose an option' : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-card border bg-white px-3 py-2 text-sm text-charcoal focus-ring',
            error ? 'border-red-500' : 'border-grey',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-label={fallbackName}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
