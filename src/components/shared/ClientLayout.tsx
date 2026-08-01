'use client';

import { DemoInitWrapper } from './DemoGuard';
import { ToastProvider } from './Toast';
import { UnsavedProvider } from '@/lib/unsaved-changes';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoInitWrapper>
      <UnsavedProvider>
        <ToastProvider>{children}</ToastProvider>
      </UnsavedProvider>
    </DemoInitWrapper>
  );
}
