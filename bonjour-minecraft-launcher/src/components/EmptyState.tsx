import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

export default function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={compact ? 'text-center py-12' : 'flex flex-col items-center justify-center py-20'}>
      <Icon
        className={compact ? 'w-10 h-10 mx-auto mb-3 opacity-20' : 'w-16 h-16 mb-4 opacity-20'}
        style={{ color: 'var(--text-muted)' }}
      />
      <p
        className="text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </p>
      {description && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--surface-hover)',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}