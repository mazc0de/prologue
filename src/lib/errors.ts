import type { PostgrestError } from '@supabase/supabase-js'

/** Thrown when RLS silently filtered an UPDATE/DELETE down to zero rows. */
export class NotAllowedError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message)
    this.name = 'NotAllowedError'
  }
}

type Result<T> = { data: T | null; error: PostgrestError | null }

/** Unwraps a Supabase result, throwing on error. */
export function unwrap<T>({ data, error }: Result<T>): T {
  if (error) throw toFriendlyError(error)
  return data as T
}

/**
 * Unwraps a mutation that used `.select()`. RLS-blocked UPDATE/DELETE return
 * zero rows and no error, so an empty result is treated as "not allowed".
 */
export function expectRows<T>({ data, error }: Result<T[]>): T[] {
  if (error) throw toFriendlyError(error)
  if (!data || data.length === 0) throw new NotAllowedError()
  return data
}

export function toFriendlyError(error: PostgrestError | Error): Error {
  if (!('code' in error)) return error
  switch (error.code) {
    case '23505':
      return new Error(error.message.includes('already a member') ? 'This person is already a Member.' : 'That already exists.')
    case '23503':
      return new Error('This is still in use. Move or delete what depends on it first.')
    case '23514':
      return new Error(error.message.includes('Assignee') ? 'The Assignee must be a Member of this Project.' : 'Some values are not valid.')
    case '42501':
      return new NotAllowedError()
    default:
      return new Error(error.message)
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
