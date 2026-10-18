'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface FormFieldProps {
  label: string
  type?: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  error?: string
  disabled?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function FormField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  error,
  disabled,
  icon,
  rightIcon,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="form-field">
      <label className="field-label">{label}</label>
      <div className="field-input-wrapper">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        />
        {rightIcon && (
          <div className="field-right-icon">{rightIcon}</div>
        )}
      </div>
      {error && <span className="field-error">{error}</span>}

      <style jsx>{`
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--auth-border);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 400;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }

        .field-input::placeholder {
          color: var(--text-subtle);
        }

        .field-input:focus {
          border-color: rgba(201, 168, 76, 0.8);
        }

        .field-input-error {
          border-color: #e05c5c;
        }

        .field-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .field-right-icon {
          position: absolute;
          right: 0;
          display: flex;
          align-items: center;
          color: var(--text-muted);
        }

        .field-error {
          font-size: 12px;
          color: #e05c5c;
        }
      `}</style>
    </div>
  )
}

interface PasswordFieldProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  error?: string
  disabled?: boolean
  showStrength?: boolean
}

export function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  error,
  disabled,
  showStrength,
}: PasswordFieldProps) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const getStrength = (pwd: string) => {
    if (pwd.length === 0) return 0
    if (pwd.length < 6) return 1
    if (pwd.length < 10) return 2
    return 3
  }

  const strength = getStrength(value)
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong']
  const strengthColors = ['', '#e05c5c', '#e0bf6a', '#4ade80']

  return (
    <div className="password-field">
      <label className="field-label">{label}</label>
      <div className="field-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`field-input ${error ? 'field-input-error' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="toggle-password"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}

      {showStrength && (
        <>
          <div className="strength-bar">
            <div
              className="strength-fill"
              style={{
                width: `${(strength / 3) * 100}%`,
                background: strengthColors[strength],
              }}
            />
          </div>
          <div className="strength-text">
            {strength > 0 && (
              <span style={{ color: strengthColors[strength] }}>
                {strengthLabels[strength]}
              </span>
            )}
            <span className="strength-hint">6+ characters</span>
          </div>
        </>
      )}

      <style jsx>{`
        .password-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--auth-border);
          border-radius: 10px;
          padding: 12px 40px 12px 16px;
          font-size: 15px;
          font-weight: 400;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }

        .field-input::placeholder {
          color: var(--text-subtle);
        }

        .field-input:focus {
          border-color: rgba(201, 168, 76, 0.8);
        }

        .field-input-error {
          border-color: #e05c5c;
        }

        .field-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-password {
          position: absolute;
          right: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .toggle-password:hover {
          color: var(--accent-gold);
        }

        .field-error {
          font-size: 12px;
          color: #e05c5c;
        }

        .strength-bar {
          height: 4px;
          background: var(--auth-border);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }

        .strength-fill {
          height: 100%;
          transition: width 0.3s, background 0.3s;
          border-radius: 2px;
        }

        .strength-text {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-top: 4px;
        }

        .strength-hint {
          color: var(--text-subtle);
        }
      `}</style>
    </div>
  )
}
