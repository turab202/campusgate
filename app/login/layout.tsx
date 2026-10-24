import { AppProviders } from '@/src/components/AppProviders';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
