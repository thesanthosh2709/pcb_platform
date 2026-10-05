import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PCB Component Hub',
  description: 'Download PCB Footprints & Symbols',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased bg-dot-pattern selection:bg-blue-200">
        <nav className="border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
            <a href="/" className="text-2xl font-extrabold tracking-tight text-slate-800 hover:text-blue-600 transition-colors">
              <span className="text-blue-600">⚡</span> ComponentHub
            </a>
            <a href="/request" className="text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all border border-slate-700 px-5 py-2.5 rounded-full shadow-lg shadow-slate-900/20 active:scale-95">Request Component</a>
          </div>
        </nav>
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"></div>
          <div className="absolute top-40 -right-4 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
        <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm font-medium bg-white/50 backdrop-blur-sm">
          &copy; {new Date().getFullYear()} ComponentHub. Built for Electronic Engineers.
        </footer>
      </body>
    </html>
  )
}