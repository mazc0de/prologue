import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { MAX_TECH_TAGS } from '@/lib/types'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
}

/** Free-text Tech Tags: Enter or comma adds, Backspace on empty removes the last. */
export function TagInput({ label, value, onChange, max = MAX_TECH_TAGS }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const full = value.length >= max

  function add(raw: string) {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || full) return
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...value, tag.slice(0, 40)])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="h-6 gap-1 pr-0.5 pl-2">
            {tag}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="size-4 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X />
            </Button>
          </Badge>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          aria-describedby={`${id}-hint`}
          placeholder={value.length ? '' : 'React, Laravel, Postgres…'}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:hidden"
        />
      </div>
      <FieldDescription id={`${id}-hint`}>
        Press Enter to add · {value.length} of {max}
      </FieldDescription>
    </Field>
  )
}
