'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { apiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/use-debounce';
import type { ApiResponse, Issue, Project } from '@arcadiux/shared/types';

interface SearchResult {
  issues: Issue[];
  projects: Project[];
}

export function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult>({ issues: [], projects: [] });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults({ issues: [], projects: [] });
      return;
    }

    try {
      const response = await apiClient.get<ApiResponse<SearchResult>>(
        '/api/search',
        { q: searchQuery },
      );
      setResults(response.data);
    } catch {
      setResults({ issues: [], projects: [] });
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 w-64 justify-start text-sm text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Buscar...</span>
          <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar issues, proyectos..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {results.projects.length > 0 && (
            <CommandGroup heading="Proyectos">
              {results.projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project-${project.id}`}
                  onSelect={() => {
                    router.push(`/projects/${project.id}/board`);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {project.key}
                  </span>
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.issues.length > 0 && (
            <CommandGroup heading="Issues">
              {results.issues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  value={`issue-${issue.id}`}
                  onSelect={() => {
                    router.push(`/projects/${issue.projectId}/board`);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="mr-2 text-xs font-medium text-muted-foreground">
                    #{issue.issueNumber}
                  </span>
                  {issue.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </header>
  );
}
