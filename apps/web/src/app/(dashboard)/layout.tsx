'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api-client';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useIssueModal } from '@/stores/use-issue-modal';
import { IssueDetail } from '@/components/issue/issue-detail';
import { useParams } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const { isOpen, selectedIssueId, closeIssue } = useIssueModal();
  const params = useParams<{ projectId: string }>();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    setIsReady(true);
  }, [router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Global Issue Detail Modal */}
      {selectedIssueId && params?.projectId && (
        <IssueDetail
          issueId={selectedIssueId}
          projectId={params.projectId}
          projectKey=""
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) closeIssue();
          }}
        />
      )}
    </div>
  );
}
