import { Plus, X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { MAX_TAGS } from '@/lib/types'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
  /** Tags already used elsewhere (most used first), offered as one-click options. */
  suggestions?: string[]
}

const MAX_SHOWN_SUGGESTIONS = 8

/**
 * Free-text Tags: Enter or comma adds, Backspace on empty removes the last.
 * Tags used before are offered below the field and narrowed as you type.
 */
export function TagInput({ label, value, onChange, max = MAX_TAGS, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const full = value.length >= max
  const options = full ? [] : matchingSuggestions(suggestions, value, draft)

  function add(raw: string) {
    const typed = raw.trim().replace(/,$/, '').trim()
    if (!typed || full) return
    if (value.some((t) => t.toLowerCase() === typed.toLowerCase())) {
      setDraft('')
      return
    }
    // Reuse an existing Tag's spelling, so "web" and "Web" stay one Tag across Projects.
    const tag = suggestions.find((t) => t.toLowerCase() === typed.toLowerCase()) ?? typed
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
              type="button"
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
          placeholder={value.length ? '' : 'Web, Client, Internal…'}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:hidden"
        />
      </div>
      {options.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{draft.trim() ? 'Matching:' : 'Used before:'}</span>
          {options.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="xs"
              aria-label={`Add Tag ${tag}`}
              // Keep focus in the field, so its blur doesn't also add the half-typed draft.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(tag)}
              className="font-normal"
            >
              <Plus /> {tag}
            </Button>
          ))}
        </div>
      )}
      <FieldDescription id={`${id}-hint`}>
        Press Enter to add · {value.length} of {max}
      </FieldDescription>
    </Field>
  )
}

/** Suggestions not on this Project yet; while typing, those containing the draft, prefix matches first. */
function matchingSuggestions(suggestions: string[], value: string[], draft: string): string[] {
  const taken = new Set(value.map((t) => t.toLowerCase()))
  const needle = draft.trim().toLowerCase()
  const available = suggestions.filter((t) => !taken.has(t.toLowerCase()))
  const matches = needle
    ? [
        ...available.filter((t) => t.toLowerCase().startsWith(needle)),
        ...available.filter((t) => !t.toLowerCase().startsWith(needle) && t.toLowerCase().includes(needle)),
      ]
    : available
  return matches.slice(0, MAX_SHOWN_SUGGESTIONS)
}
