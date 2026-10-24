import { AppProviders } from '@/src/components/AppProviders';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
