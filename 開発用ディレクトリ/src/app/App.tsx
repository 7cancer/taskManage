import { StoreProvider } from './providers/StoreProvider';
import { MainRoute } from './routes/MainRoute';

export function App() {
  return (
    <StoreProvider>
      <MainRoute />
    </StoreProvider>
  );
}
