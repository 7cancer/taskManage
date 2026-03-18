import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#16a34a',
      dark: '#15803d',
      contrastText: '#fff',
    },
    secondary: {
      main: '#0f172a',
    },
    error: {
      main: '#b91c1c',
    },
    background: {
      default: '#f5f7fb',
      paper: '#fff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#475569',
    },
  },
  typography: {
    fontFamily: 'inherit',
  },
  shape: {
    borderRadius: 8,
  },
});
