export type BackgroundVariant = 'gradient' | 'particles' | 'mesh' | 'aurora' | 'waves' | 'none'
export type BackgroundIntensity = 'subtle' | 'normal' | 'strong'
export type PerformanceTier = 'high' | 'medium' | 'low'

interface DynamicBackgroundProps {
  variant?: BackgroundVariant
  intensity?: BackgroundIntensity
  performanceTier?: PerformanceTier
}

export default function DynamicBackground(_props: DynamicBackgroundProps) {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}