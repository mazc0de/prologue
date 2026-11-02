import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoading } from '@/components/Loading'
import { useAuth } from './AuthProvider'

/** Routes that need a signed-in user. */
export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()
  if (session === undefined) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Login / register / forgot: bounce signed-in users to the dashboard. */
export function GuestOnly() {
  const { session, isRecovery } = useAuth()
  if (session === undefined) return <FullScreenLoading />
  if (isRecovery) return <Navigate to="/reset-password" replace />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}
