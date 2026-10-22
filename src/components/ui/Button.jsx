export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary'

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    icon: 'btn-icon',
  }[size] || ''

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={15} aria-hidden="true" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={15} aria-hidden="true" />}
    </button>
  )
}
