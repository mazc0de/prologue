import { useId, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-app', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

interface MarkdownFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  autoFocus?: boolean
  required?: boolean
  /** Replaces the "Markdown supported" hint and switches back to Write so the field can be fixed. */
  error?: string | null
}

/** Textarea with a Write / Preview switch (shadcn Tabs). */
export function MarkdownField({ label, value, onChange, placeholder, rows = 8, autoFocus, required, error }: MarkdownFieldProps) {
  const id = useId()
  const [tab, setTab] = useState('write')
  return (
    <Tabs value={error ? 'write' : tab} onValueChange={setTab} className="gap-2">
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <TabsList className="h-8" aria-label={`${label} mode`}>
          <TabsTrigger value="write" className="px-2.5 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2.5 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          rows={rows}
          autoFocus={autoFocus}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y font-mono text-[13px] leading-5"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="rounded-md border px-3 py-2" style={{ minHeight: rows * 20 + 18 }}>
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted-foreground">Nothing to preview.</p>}
        </div>
      </TabsContent>
      <p id={`${id}-hint`} className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
        {error ?? 'Markdown supported.'}
      </p>
    </Tabs>
  )
}
