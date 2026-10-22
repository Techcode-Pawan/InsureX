export default function Select({
  label,
  id,
  hint,
  error,
  options = [],
  placeholder,
  className = '',
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).slice(2)}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`select ${error ? 'error' : ''}`}
        aria-describedby={error ? `${selectId}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
      {hint && !error && <p className="input-hint">{hint}</p>}
      {error && <p id={`${selectId}-error`} className="input-error-msg" role="alert">{error}</p>}
    </div>
  )
}
