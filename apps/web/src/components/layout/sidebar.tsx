'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  Kanban,
  ListTodo,
  Timer,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/stores/use-sidebar';
import { clearTokens } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { isCollapsed, toggle } = useSidebar();
  const projectId = params?.projectId;

  const mainNavItems: NavItem[] = [
    { label: 'Proyectos', href: '/projects', icon: FolderKanban },
    { label: 'Buscar', href: '#search', icon: Search, shortcut: 'Cmd+K' },
  ];

  const projectNavItems: NavItem[] = projectId
    ? [
        {
          label: 'Tablero',
          href: `/projects/${projectId}/board`,
          icon: Kanban,
        },
        {
          label: 'Backlog',
          href: `/projects/${projectId}/backlog`,
          icon: ListTodo,
        },
        {
          label: 'Sprints',
          href: `/projects/${projectId}/sprints`,
          icon: Timer,
        },
        {
          label: 'Reportes',
          href: `/projects/${projectId}/reports`,
          icon: BarChart3,
        },
        {
          label: 'Retro',
          href: `/projects/${projectId}/retro`,
          icon: MessageSquare,
        },
        {
          label: 'Configuración',
          href: `/projects/${projectId}/settings`,
          icon: Settings,
        },
      ]
    : [];

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const handleSearchClick = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-background transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/projects" className="flex items-center gap-2">
            <Image
              src="/logo-arcadiux.png"
              alt="Arcadiux"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            {!isCollapsed && (
              <span className="text-lg font-bold text-primary">Arcadiux</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={cn('ml-auto h-8 w-8', isCollapsed && 'ml-0')}
            onClick={toggle}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const isSearch = item.href === '#search';
              const isActive = !isSearch && pathname?.startsWith(item.href);

              const navButton = (
                <button
                  key={item.label}
                  onClick={isSearch ? handleSearchClick : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center px-2',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {item.shortcut}
                        </kbd>
                      )}
                    </>
                  )}
                </button>
              );

              if (isSearch) {
                return isCollapsed ? (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label} ({item.shortcut})
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  navButton
                );
              }

              return isCollapsed ? (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>{navButton}</Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link key={item.label} href={item.href}>
                  {navButton}
                </Link>
              );
            })}
          </div>

          {/* Project Navigation */}
          {projectNavItems.length > 0 && (
            <>
              <Separator className="my-3" />
              {!isCollapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Proyecto
                </p>
              )}
              <div className="space-y-1">
                {projectNavItems.map((item) => {
                  const isActive = pathname?.endsWith(item.href.split('/').pop() ?? '');

                  const navLink = (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center px-2',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );

                  return isCollapsed ? (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3',
                  isCollapsed && 'justify-center px-2',
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">U</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <span className="text-sm font-medium">Cuenta</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Configuración de Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
