import { toast } from 'sonner'
import { errorMessage } from './errors'

/** App-wide toasts (shadcn Sonner). `notify.error` accepts any thrown value. */
export const notify = {
  show: (message: string) => toast(message),
  success: (message: string) => toast.success(message),
  error: (error: unknown) => toast.error(errorMessage(error)),
}
