import { ButtonHTMLAttributes, CSSProperties } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'inherit',
  fontWeight: 600,
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  lineHeight: 1.4,
};

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { fontSize: 13, padding: '4px 10px' },
  md: { fontSize: 14, padding: '6px 14px' },
  lg: { fontSize: 16, padding: '10px 22px' },
};

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: '#16a34a',
    color: '#fff',
    border: '1px solid #15803d',
  },
  secondary: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #cbd5e1',
  },
  danger: {
    background: '#fff',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
  },
  link: {
    background: 'transparent',
    color: '#2563eb',
    border: 'none',
    padding: 0,
    textDecoration: 'underline',
    fontWeight: 400,
  },
  ghost: {
    background: 'transparent',
    color: '#475569',
    border: '1px solid transparent',
  },
};

const DISABLED_STYLE: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

export function Button({ variant = 'secondary', size = 'md', style, disabled, ...rest }: ButtonProps) {
  const merged: CSSProperties = {
    ...BASE_STYLE,
    ...SIZE_STYLES[size],
    ...VARIANT_STYLES[variant],
    ...(disabled ? DISABLED_STYLE : {}),
    ...style,
  };

  return <button type="button" disabled={disabled} style={merged} {...rest} />;
}
