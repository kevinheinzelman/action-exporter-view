import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Action Exporter Viewer',
  description: 'Read-only strategy and board viewer powered by static JSON exports.'
};

const NAV_ITEMS = [
  { href: '/', label: 'Current Board' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/strategy', label: 'Strategy' },
  { href: '/about-data', label: 'About Data' }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="app-sidebar-inner">
              <div className="brand">
                <div className="brand-mark" aria-hidden="true">&#127826;&#127826;</div>
                <div className="brand-copy">
                  <h1>Action Exporter</h1>
                  <p>powered by The Plums Model&trade;</p>
                </div>
              </div>

              <nav className="nav nav-vertical">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <div className="app-main">
            <div className="shell">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
