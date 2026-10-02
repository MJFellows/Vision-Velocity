import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, ...rest }, ref) => {
    // Every input gets an id so its label is always linked (screen readers, tapping the label).
    const autoId = useId();
    const inputId = id || rest.name || autoId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-card border px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/40 focus-ring',
            error ? 'border-red-500' : 'border-grey',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && <p className="mt-1 text-sm text-charcoal/70">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
