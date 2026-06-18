import './Form.scss';

export function FormGrid({ children, columns = 2 }) {
  return <div className={`form-grid form-grid--${columns}`}>{children}</div>;
}

export function FormFull({ children }) {
  return <div className="form-full">{children}</div>;
}

export function Field({ label, required, hint, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="field__hint">{hint}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="divider" />;
}

export function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}
