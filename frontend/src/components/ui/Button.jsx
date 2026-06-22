import './Button.scss';

export function Button({
  children,
  variant = 'default', // default | primary | success | danger
  size = 'md', // sm | md
  loading = false,
  disabled = false,
  fullWidth = false,
  icon = null,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
