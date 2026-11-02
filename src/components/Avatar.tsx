import { Avatar as AvatarRoot, AvatarFallback } from '@/components/ui/avatar'
import { initialsOf } from '@/lib/avatar'
import { cn } from '@/lib/utils'

interface AvatarProps {
  userId: string
  name: string
  size?: 20 | 24 | 28 | 32 | 36 | 40
  className?: string
  title?: string
}

const textSize = { 20: 'text-[9px]', 24: 'text-[10px]', 28: 'text-[10.5px]', 32: 'text-[11px]', 36: 'text-[12px]', 40: 'text-[13px]' }

/** A Member as a square initials chip with a hairline border (shadcn Avatar, ink only). */
export function Avatar({ userId: _userId, name, size = 28, className, title }: AvatarProps) {
  return (
    <AvatarRoot role="img" aria-label={name} title={title ?? name} style={{ width: size, height: size }} className={cn('shrink-0 rounded-sm', className)}>
      <AvatarFallback className={cn('rounded-sm border bg-card font-semibold tracking-wide text-foreground select-none', textSize[size])}>
        {initialsOf(name)}
      </AvatarFallback>
    </AvatarRoot>
  )
}
