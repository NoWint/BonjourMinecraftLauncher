import { useThemeStore } from './useThemeStore'

const PIXEL_COLORS = { primary: '#E8C547', dim: '#5A7A3A' }

const PIXEL_ICONS: Record<string, string[]> = {
  home: [
    '..#......',
    '.###.....',
    '.###.....',
    '#########',
    '#########',
    '.###.###.',
    '.###.###.',
  ],
  versions: [
    '########.',
    '#......#.',
    '#.####.#.',
    '#.#..#.#.',
    '#.####.#.',
    '#......#.',
    '########.',
  ],
  mods: [
    '..#......',
    '#.#......',
    '##.##...#',
    '#.#.#.#.#',
    '##.##...#',
    '...#.#.#.',
    '.....#.#.',
  ],
  modpack: [
    '.##......',
    '#..#...##',
    '#..#..#.#',
    '.##...#.#',
    '......#.#',
    '......#.#',
    '......###',
  ],
  servers: [
    '...##....',
    '..####...',
    '.##..##..',
    '########.',
    '########.',
    '#......#.',
    '#......#.',
  ],
  worlds: [
    '..####...',
    '.##..##..',
    '#......#.',
    '#.####.#.',
    '#.#..#.#.',
    '##....##.',
    '.###.###.',
  ],
  resources: [
    '....#....',
    '...###...',
    '..#####..',
    '...#.#...',
    '....#....',
    '....#....',
    '....#....',
  ],
  accounts: [
    '...##....',
    '..#..#...',
    '..#..#...',
    '...##....',
    '..####...',
    '.##..##..',
    '##....##.',
  ],
  settings: [
    '...##....',
    '..#..#...',
    '.#....#..',
    '#..##..#.',
    '.#....#..',
    '..#..#...',
    '...##....',
  ],
  appearance: [
    '...##....',
    '..#..#...',
    '.#....#..',
    '#.####.#.',
    '#.####.#.',
    '.##..##..',
    '..#..#...',
  ],
  stats: [
    '#......#.',
    '#......#.',
    '#......#.',
    '.##..##..',
    '..#..#...',
    '..#..#...',
    '...##....',
  ],
}

function PixelIcon({ name, size = 20 }: { name: string; size?: number }) {
  const pattern = PIXEL_ICONS[name]
  if (!pattern) return null
  const rows = pattern.length
  const cols = pattern[0].length
  const px = size / Math.max(rows, cols)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {pattern.map((row, y) =>
        row.split('').map((char, x) => {
          if (char === '.') return null
          const fill = char === '#' ? PIXEL_COLORS.primary : PIXEL_COLORS.dim
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />
          )
        })
      )}
    </svg>
  )
}

const WABI_LINE_PATHS: Record<string, string> = {
  home: 'M3 9l6-7 6 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
  versions: 'M4 7h10M4 11h10M4 15h7M17 3l4 4-4 4',
  mods: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z',
  modpack: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z',
  servers: 'M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  worlds: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10z',
  resources: 'M12 2l7 6v12a2 2 0 01-2 2H7a2 2 0 01-2-2V8z',
  accounts: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  appearance: 'M12 2l4 4h-3v5H8V6H5l4-4z M5 20h3v-5h3v5h3l-4 4z',
  stats: 'M18 20V10M12 20V4M6 20v-6',
}

function WabiLineIcon({ name, size = 20 }: { name: string; size?: number }) {
  const d = WABI_LINE_PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

export type IconName =
  | 'home'
  | 'versions'
  | 'mods'
  | 'modpack'
  | 'servers'
  | 'worlds'
  | 'resources'
  | 'accounts'
  | 'settings'
  | 'appearance'
  | 'stats'

interface ThemeIconProps {
  name: IconName
  size?: number
  className?: string
}

export default function ThemeIcon({ name, size = 20, className }: ThemeIconProps) {
  const theme = useThemeStore((s) => s.activeTheme)
  if (theme === 'wabi-sabi') {
    return <WabiLineIcon name={name} size={size} />
  }
  return <PixelIcon name={name} size={size} />
}

export function SimpleIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

export { PIXEL_ICONS, WABI_LINE_PATHS }