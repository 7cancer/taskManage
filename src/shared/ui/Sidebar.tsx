import { PropsWithChildren, ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SidebarSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SidebarSection({ title, defaultOpen = false, children }: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      disableGutters
      elevation={0}
      sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

const SIDEBAR_WIDTH = 280;

export function Sidebar({ children }: PropsWithChildren) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
          border: 'none',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', p: 1 }}>{children}</Box>
    </Drawer>
  );
}
