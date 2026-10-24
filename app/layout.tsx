import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CampusGate',
  description: 'University Access, Asset & Security Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--cg-background)] text-[var(--cg-text)]">
        {children}
      </body>
    </html>
  );
}
