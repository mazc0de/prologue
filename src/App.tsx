import { createBrowserRouter, Link } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ForgotPasswordPage } from '@/auth/ForgotPasswordPage'
import { GuestOnly, RequireAuth } from '@/auth/guards'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { ResetPasswordPage } from '@/auth/ResetPasswordPage'
import { AppShell } from '@/layout/AppShell'
import { isSupabaseConfigured } from '@/lib/supabase'

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            lazy: () => import('@/features/dashboard/DashboardPage').then((m) => ({ Component: m.DashboardPage })),
            HydrateFallback: () => null,
          },
          {
            path: '/projects',
            lazy: () => import('@/features/projects/ProjectsPage').then((m) => ({ Component: m.ProjectsPage })),
            HydrateFallback: () => null,
          },
          {
            path: '/projects/:projectId',
            lazy: () => import('@/features/project/ProjectPage').then((m) => ({ Component: m.ProjectPage })),
            HydrateFallback: () => null,
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export function App() {
  if (!isSupabaseConfigured) return <MissingConfig />
  return <RouterProvider router={router} />
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-sm font-medium underline-offset-2 hover:underline">
        Back to Dashboard
      </Link>
    </main>
  )
}

function MissingConfig() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
      <p className="text-sm text-muted-foreground">
        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and set{' '}
        <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>,
        then restart the dev server.
      </p>
    </main>
  )
}
