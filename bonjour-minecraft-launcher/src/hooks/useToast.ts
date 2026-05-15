import { toast as sonnerToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

function notify(type: ToastType, message: string, options?: ToastOptions) {
  const baseOptions: Record<string, unknown> = {
    description: options?.description,
    duration: options?.duration ?? 4000,
  }

  if (options?.action) {
    baseOptions.action = options.action
  }

  switch (type) {
    case 'success':
      return sonnerToast.success(message, baseOptions)
    case 'error':
      return sonnerToast.error(message, { ...baseOptions, duration: options?.duration ?? 6000 })
    case 'warning':
      return sonnerToast.warning?.(message, baseOptions) ?? sonnerToast(message, { ...baseOptions, icon: '⚠️' })
    case 'info':
      return sonnerToast.info?.(message, baseOptions) ?? sonnerToast(message, baseOptions)
  }
}

export function useToast() {
  return {
    toast: {
      success: (message: string, options?: ToastOptions) => notify('success', message, options),
      error: (message: string, options?: ToastOptions) => notify('error', message, options),
      warning: (message: string, options?: ToastOptions) => notify('warning', message, options),
      info: (message: string, options?: ToastOptions) => notify('info', message, options),
    },
  }
}

export { sonnerToast as toast }
