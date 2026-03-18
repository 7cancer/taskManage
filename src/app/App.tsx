import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { StoreProvider } from './providers/StoreProvider';
import { MainRoute } from './routes/MainRoute';
import { theme } from './theme';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StoreProvider>
        <MainRoute />
      </StoreProvider>
    </ThemeProvider>
  );
}
