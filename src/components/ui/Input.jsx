export default function Input({
  label,
  id,
  hint,
  error,
  prefixIcon: PrefixIcon,
  suffixIcon: SuffixIcon,
  className = '',
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {PrefixIcon && (
          <span className="input-prefix-icon">
            <PrefixIcon size={15} aria-hidden="true" />
          </span>
        )}
        <input
          id={inputId}
          className={`input ${PrefixIcon ? 'input-icon-left' : ''} ${SuffixIcon ? 'input-icon-right' : ''} ${error ? 'error' : ''}`}
          aria-describedby={hint ? `${inputId}-hint` : error ? `${inputId}-error` : undefined}
          aria-invalid={!!error}
          {...props}
        />
        {SuffixIcon && (
          <span className="input-suffix-icon">
            <SuffixIcon size={15} aria-hidden="true" />
          </span>
        )}
      </div>
      {hint && !error && <p id={`${inputId}-hint`} className="input-hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="input-error-msg" role="alert">{error}</p>}
    </div>
  )
}
