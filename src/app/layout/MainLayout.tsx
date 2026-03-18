import { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { APP_VERSION } from '../version';

interface MainLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>
            Offline Task Manager
          </Typography>
          <Chip
            label={`v${APP_VERSION}`}
            size="small"
            color="secondary"
            sx={{ ml: 1.5, height: 22, fontSize: 11 }}
          />
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
