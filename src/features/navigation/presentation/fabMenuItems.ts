import type { LucideIcon } from 'lucide-react-native';
import { Calendar, Shield } from 'lucide-react-native';

export type FabMenuItem = {
  icon: LucideIcon;
  key: string;
  route: string;
  title: string;
};

export function getFabMenuItems(isStaff: boolean): FabMenuItem[] {
  if (!isStaff) return [];

  return [
    { key: 'staff', title: 'Staff', route: '/(tabs)/attendance', icon: Shield },
  ];
}
