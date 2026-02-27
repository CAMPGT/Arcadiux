'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Project, WorkflowStatus, ProjectMember, User } from '@arcadiux/shared/types';

export interface ProjectWithDetails extends Project {
  members?: (ProjectMember & { user: User })[];
  statuses?: WorkflowStatus[];
}

export function useProject() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ProjectWithDetails>>(
        `/api/projects/${projectId}`,
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  return {
    project: query.data,
    projectId,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useProjectMembers() {
  const { projectId } = useProject();

  return useQuery({
    queryKey: ['project', projectId, 'members'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<(ProjectMember & { user: User })[]>>(
        `/api/projects/${projectId}/members`,
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectStatuses() {
  const { projectId } = useProject();

  return useQuery({
    queryKey: ['project', projectId, 'statuses'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<WorkflowStatus[]>>(
        `/api/projects/${projectId}/statuses`,
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}
