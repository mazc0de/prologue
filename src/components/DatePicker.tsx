import { CalendarDays, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDueDate, isoDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** A `date` column value: "YYYY-MM-DD", or "" for none. */
type DateValue = string

function parse(value: DateValue): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** shadcn date picker (Popover + Calendar) with a label and a clear button. */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
}: {
  label: string
  value: DateValue
  onChange: (value: DateValue) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const selected = parse(value)

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              className={cn('flex-1 justify-start font-normal', !value && 'text-muted-foreground')}
            >
              <CalendarDays className="text-muted-foreground" />
              {value ? formatDueDate(value) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              captionLayout="dropdown"
              onSelect={(date) => {
                onChange(date ? isoDate(date) : '')
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button variant="ghost" size="icon" aria-label={`Clear ${label}`} title={`Clear ${label}`} onClick={() => onChange('')}>
            <X />
          </Button>
        )}
      </div>
    </Field>
  )
}
