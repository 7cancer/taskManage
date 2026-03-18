import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const SIZE_MAP: Record<ButtonSize, MuiButtonProps['size']> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

function mapProps(variant: ButtonVariant, size: ButtonSize): Partial<MuiButtonProps> {
  const mapped: Partial<MuiButtonProps> = { size: SIZE_MAP[size] };

  switch (variant) {
    case 'primary':
      mapped.variant = 'contained';
      mapped.color = 'primary';
      break;
    case 'secondary':
      mapped.variant = 'outlined';
      mapped.color = 'inherit';
      break;
    case 'danger':
      mapped.variant = 'outlined';
      mapped.color = 'error';
      break;
    case 'link':
      mapped.variant = 'text';
      mapped.color = 'primary';
      break;
    case 'ghost':
      mapped.variant = 'text';
      mapped.color = 'inherit';
      break;
  }

  return mapped;
}

export function Button({ variant = 'secondary', size = 'md', ...rest }: ButtonProps) {
  const muiProps = mapProps(variant, size);

  return <MuiButton disableElevation {...muiProps} {...rest} />;
}
