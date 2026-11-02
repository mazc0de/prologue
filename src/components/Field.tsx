import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/*
 * Labelled form controls composed from shadcn Field + Input / Textarea / Select.
 * One label, an optional hint, and an error that replaces the hint.
 */

interface ShellProps {
  label: string
  hint?: ReactNode
  error?: string | null
  hideLabel?: boolean
  containerClassName?: string
}

function Shell({
  id,
  label,
  hint,
  error,
  hideLabel,
  containerClassName,
  children,
}: ShellProps & { id: string; children: ReactNode }) {
  return (
    <Field data-invalid={error ? true : undefined} className={cn('gap-2', containerClassName)}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      {children}
      {hint && !error && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

const describedBy = (id: string, error?: string | null, hint?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  containerClassName,
  id,
  ...props
}: ComponentProps<typeof Input> & ShellProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} hideLabel={hideLabel} containerClassName={containerClassName}>
      <Input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, error, hint)} {...props} />
    </Shell>
  )
}

/** A password input with a show/hide toggle at its end. */
export function PasswordField({
  label,
  hint,
  error,
  hideLabel,
  containerClassName,
  id,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'> & ShellProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [shown, setShown] = useState(false)
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} hideLabel={hideLabel} containerClassName={containerClassName}>
      <InputGroup>
        <InputGroupInput
          id={fieldId}
          type={shown ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={shown ? 'Hide password' : 'Show password'}
            title={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            aria-controls={fieldId}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOff /> : <Eye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Shell>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  hideLabel,
  containerClassName,
  id,
  className,
  ...props
}: ComponentProps<typeof Textarea> & ShellProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} hideLabel={hideLabel} containerClassName={containerClassName}>
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn('min-h-28 resize-y', className)}
        {...props}
      />
    </Shell>
  )
}

export interface SelectOption<T extends string> {
  value: T
  label: ReactNode
}

/** shadcn Select with a label. Radix forbids an empty-string item value; use a sentinel such as "none". */
export function SelectField<T extends string>({
  label,
  hint,
  error,
  hideLabel,
  containerClassName,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
}: ShellProps & {
  value: T
  onValueChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} containerClassName={containerClassName}>
      <Select value={value} onValueChange={(v) => onValueChange(v as T)} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={error ? true : undefined} className={cn('w-full', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive-soft">
      <AlertCircle />
      <AlertDescription className="text-destructive-soft-foreground">{message}</AlertDescription>
    </Alert>
  )
}
