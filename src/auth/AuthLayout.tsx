import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Wordmark } from '@/components/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 py-6 sm:px-6">
      <Link to="/" className="self-start rounded-lg">
        <Wordmark />
      </Link>
      <main className="flex flex-1 items-start justify-center pt-[12vh]">
        <div className="w-full max-w-[400px]">
          <Card className="gap-6 py-8">
            <CardHeader className="px-6 sm:px-8">
              <CardTitle className="text-2xl font-bold tracking-[-0.01em]">{title}</CardTitle>
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </CardHeader>
            <CardContent className="px-6 sm:px-8">{children}</CardContent>
          </Card>
          {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
