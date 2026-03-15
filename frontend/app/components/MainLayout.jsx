'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />

        <main
          ref={mainRef}
          tabIndex={-1}
          role="main"
          className="flex-1 p-6 outline-none animate-in fade-in duration-700 ease-in-out"
          key={pathname}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
