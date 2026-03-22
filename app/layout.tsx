import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feature Flag Forensics',
  description: 'Debug and explain feature flag outcomes with session-level evidence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
