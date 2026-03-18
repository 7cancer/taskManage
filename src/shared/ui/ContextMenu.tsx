import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface ContextMenuProps {
  anchorPosition: { top: number; left: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ anchorPosition, items, onClose }: ContextMenuProps) {
  return (
    <Menu
      open={anchorPosition !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition ?? undefined}
    >
      {items.map((item) => (
        <MenuItem
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
