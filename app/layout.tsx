import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Action Exporter Viewer',
  description: 'Read-only strategy and board viewer powered by static JSON exports.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <h1>Action Exporter</h1>
              <p>Read-only strategy, tournament, and board viewer.</p>
            </div>
            <nav className="nav">
              <Link href="/">Current Board</Link>
              <Link href="/strategy">Strategy</Link>
              <Link href="/tournament">Tournament</Link>
              <Link href="/games">All Games</Link>
              <Link href="/about-data">About Data</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
