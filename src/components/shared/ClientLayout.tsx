'use client';

import { DemoInitWrapper } from './DemoGuard';
import { ToastProvider } from './Toast';
import { UnsavedProvider } from '@/lib/unsaved-changes';
import { SyncProvider } from '@/lib/sync/sync-provider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoInitWrapper>
      <SyncProvider>
        <UnsavedProvider>
          <ToastProvider>{children}</ToastProvider>
        </UnsavedProvider>
      </SyncProvider>
    </DemoInitWrapper>
  );
}
