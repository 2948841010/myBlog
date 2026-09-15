import { AlertTriangle } from 'lucide-react';

/** 表单字段包装：label + 控件 + 错误/提示 */
export function Field({ label, htmlFor, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field__error">
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({ error = false, className = '', ...rest }) {
  return <input className={`input${error ? ' is-error' : ''} ${className}`.trim()} {...rest} />;
}

export function Textarea({ error = false, className = '', ...rest }) {
  return (
    <textarea className={`textarea${error ? ' is-error' : ''} ${className}`.trim()} {...rest} />
  );
}
