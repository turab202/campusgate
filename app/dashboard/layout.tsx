import { AppProviders } from '@/src/components/AppProviders';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
