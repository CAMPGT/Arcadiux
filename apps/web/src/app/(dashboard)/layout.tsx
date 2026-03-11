'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getToken, refreshAccessToken, apiClient } from '@/lib/api-client';
import type { ApiResponse, Project } from '@arcadiux/shared/types';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useIssueModal } from '@/stores/use-issue-modal';
import { IssueDetail } from '@/components/issue/issue-detail';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
  const projectId = params?.projectId;

  useEffect(() => {
    async function checkAuth() {
      if (getToken()) {
        setIsReady(true);
        return;
      }

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        setIsReady(true);
      } else {
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Project>>(
        `/api/projects/${projectId}`,
      );
      return res.data;
    },
    enabled: !!projectId && isReady,
  });

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">{children}</main>
      </div>

      {/* Global Issue Detail Modal */}
      {selectedIssueId && projectId && (
        <IssueDetail
          issueId={selectedIssueId}
          projectId={projectId}
          projectKey={project?.key ?? ''}
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) closeIssue();
          }}
        />
      )}
    </div>
  );
}
