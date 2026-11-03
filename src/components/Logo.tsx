import { cn } from '@/lib/utils'

/**
 * Prologue app icon: the full mark (grey empty cells included) on a white rounded square.
 * An <img>, not an <svg>, so SidebarMenuButton's `[&>svg]:size-4` rule doesn't shrink it.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/prologue-logo/png/prologue-app-icon-light-1024.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn('flex-none', className)}
    />
  )
}

/** Full horizontal logo (mark + outlined Space Grotesk wordmark) from the logo kit. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center', className)}>
      <img src="/prologue-logo/svg/prologue-horizontal-light.svg" alt="Prologue" className="h-7 w-auto dark:hidden" />
      <img src="/prologue-logo/svg/prologue-horizontal-dark.svg" alt="Prologue" className="hidden h-7 w-auto dark:block" />
    </span>
  )
}
