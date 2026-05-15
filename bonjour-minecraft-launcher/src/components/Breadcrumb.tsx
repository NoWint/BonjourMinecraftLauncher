import { ChevronRight, Home } from 'lucide-react'
import { motion } from 'framer-motion'

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="面包屑导航" className="flex items-center gap-1 text-sm py-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const isFirst = index === 0

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.15 }}
            className="flex items-center gap-1"
          >
            {isFirst && <Home className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />
            )}
            {isLast ? (
              <span
                className="font-medium truncate max-w-[200px]"
                style={{ color: 'var(--text-primary)' }}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="truncate max-w-[200px] hover:underline transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {item.label}
              </button>
            )}
          </motion.div>
        )
      })}
    </nav>
  )
}
