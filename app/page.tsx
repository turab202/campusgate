import type { Metadata } from 'next';
import { CampusLandingPage } from '@/src/features/public/CampusLandingPage';

export const metadata: Metadata = {
  title: 'CampusGate | Campus access and asset security',
  description:
    'A centralized university platform for device registration, gate movements, security incidents, and accountable campus operations.',
  openGraph: {
    title: 'CampusGate | Campus access and asset security',
    description:
      'Bring device records, gate operations, and campus security workflows into one accountable system.',
    type: 'website',
  },
};

export default function Page() {
  return <CampusLandingPage />;
}
