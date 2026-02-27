import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-arcadiux.png" alt="Arcadiux" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-xl font-bold">Arcadiux Agile</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Comenzar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
            <span className="mr-2">Nuevo</span>
            <span className="text-muted-foreground">
              Planificación de sprints y detección de riesgos con IA
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Gestión Ágil de Proyectos,{' '}
            <span className="text-primary">Reinventada</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Planifica sprints, gestiona backlogs, ejecuta retrospectivas y haz seguimiento
            de la velocidad con una plataforma intuitiva diseñada para equipos ágiles
            modernos. Impulsada por IA para ayudarte a entregar mejor software, más rápido.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Comenzar Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-lg border p-6">
            <div className="mb-3 rounded-full bg-blue-50 p-2.5 w-fit">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="mb-2 font-semibold">Tableros Scrum y Kanban</h3>
            <p className="text-sm text-muted-foreground">
              Tableros flexibles con arrastrar y soltar, límites WIP, flujos de trabajo
              personalizados y colaboración en tiempo real.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <div className="mb-3 rounded-full bg-green-50 p-2.5 w-fit">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold">Analíticas de Sprint</h3>
            <p className="text-sm text-muted-foreground">
              Gráficos burndown, seguimiento de velocidad y reportes de sprint para
              mantener a tu equipo al ritmo.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <div className="mb-3 rounded-full bg-violet-50 p-2.5 w-fit">
              <svg
                className="h-5 w-5 text-violet-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold">Retrospectivas en Vivo</h3>
            <p className="text-sm text-muted-foreground">
              Tableros de retro en tiempo real con notas adhesivas, votación, temporizadores
              y elementos de acción que se convierten en issues.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          Arcadiux Agile - Creado para equipos de desarrollo modernos.
        </div>
      </footer>
    </div>
  );
}
