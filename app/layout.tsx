import type { Metadata } from 'next';
import './globals.css';
import { Navbar, UserProvider } from './components/Navbar';

export const metadata: Metadata = {
  title: 'AutoQuote AI | Automotive RFQ Costing Engine - Company A, Chakan',
  description: 'Enterprise RFQ costing system with deterministic math, AI intake, rate master versioning, and multi-volume quotes for Company A, Chakan, Pune.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
        <UserProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 no-print">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-700">Company A (Chakan, Pune)</span> · Machined & Forged Parts for Automotive & Tier-1 OEMs · Revenue ₹140–160 Cr
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                Deterministic Engine v1.0 · ISO 9001:2015 Costing Compliance
              </div>
            </div>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
