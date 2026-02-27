'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCommentSchema, type CreateCommentInput } from '@arcadiux/shared/validators';
import type { ApiResponse, Comment } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/utils';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface CommentThreadProps {
  issueId: string;
  projectId: string;
}

export function CommentThread({ issueId, projectId }: CommentThreadProps) {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['issue', issueId, 'comments'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CommentWithAuthor[]>>(
        `/api/projects/${projectId}/issues/${issueId}/comments`,
      );
      return res.data;
    },
    enabled: !!issueId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { body: '' },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentInput) => {
      return apiClient.post<ApiResponse<Comment>>(
        `/api/projects/${projectId}/issues/${issueId}/comments`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', issueId, 'comments'],
      });
      reset();
      toast.success('Comentario agregado');
    },
    onError: () => {
      toast.error('Error al agregar comentario');
    },
  });

  const onSubmit = (data: CreateCommentInput) => {
    addCommentMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">
          Comentarios {comments ? `(${comments.length})` : ''}
        </h4>
      </div>

      {/* Comment List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <AvatarDisplay
                fullName={comment.author?.fullName}
                avatarUrl={comment.author?.avatarUrl}
                size="sm"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.author?.fullName ?? 'Desconocido'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Sin comentarios aún. Sé el primero en comentar.
        </p>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea
          placeholder="Escribe un comentario..."
          rows={3}
          {...register('body')}
        />
        {errors.body && (
          <p className="text-xs text-destructive">{errors.body.message}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={addCommentMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {addCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
