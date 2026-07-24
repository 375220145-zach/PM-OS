'use client';

import { DemoInitWrapper } from './DemoGuard';
import { ToastProvider } from './Toast';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoInitWrapper>
      <ToastProvider>{children}</ToastProvider>
    </DemoInitWrapper>
  );
}
