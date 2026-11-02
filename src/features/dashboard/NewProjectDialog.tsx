import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/FormDialog'
import { FormError, TextField } from '@/components/Field'
import { MarkdownField } from '@/components/Markdown'
import { TagInput } from '@/components/TagInput'
import { errorMessage } from '@/lib/errors'
import { useCreateProject } from './queries'

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const create = useCreateProject()
  const navigate = useNavigate()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { name: name.trim(), description, tech_tags: tags },
      { onSuccess: (id) => navigate(`/projects/${id}`) },
    )
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="New Project"
      description="You'll be its Owner. A Board with Backlog, Todo, In Progress, Review and Done is set up for you."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-project" loading={create.isPending}>
            Create Project
          </Button>
        </>
      }
    >
      <form id="new-project" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={create.error ? errorMessage(create.error) : null} />
        <TextField
          label="Name"
          required
          maxLength={120}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <MarkdownField
          label="Description"
          value={description}
          onChange={setDescription}
          rows={5}
          placeholder="What is it, who is it for, where does it stand?"
        />
        <TagInput label="Tech Tags" value={tags} onChange={setTags} />
      </form>
    </FormDialog>
  )
}
