import MuiTabs from '@mui/material/Tabs';
import MuiTab from '@mui/material/Tab';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <MuiTabs
      value={activeId}
      onChange={(_event, newValue: string) => onChange(newValue)}
      aria-label="表示切替"
      sx={{ mt: 2 }}
    >
      {items.map((item) => (
        <MuiTab key={item.id} value={item.id} label={item.label} />
      ))}
    </MuiTabs>
  );
}
