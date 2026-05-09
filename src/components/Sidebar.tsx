import { Home, Download, Users, Settings, Gamepad2, User } from 'lucide-react'
import type { Account } from '../types'

type Page = 'home' | 'versions' | 'accounts' | 'settings'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  selectedAccount: Account | null
}

const menuItems = [
  { id: 'home' as Page, label: '首页', icon: Home },
  { id: 'versions' as Page, label: '版本管理', icon: Download },
  { id: 'accounts' as Page, label: '账号管理', icon: Users },
  { id: 'settings' as Page, label: '设置', icon: Settings },
]

export default function Sidebar({ currentPage, onPageChange, selectedAccount }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-minecraft-green rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Bonjour</h1>
            <p className="text-xs text-gray-400">Minecraft Launcher</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-minecraft-green text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Selected Account */}
      <div className="p-4 border-t border-gray-700">
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">当前账号</p>
          {selectedAccount ? (
            <div className="flex items-center gap-3">
              <img
                src={selectedAccount.skinUrl || `https://crafatar.com/avatars/${selectedAccount.uuid}?size=64&overlay`}
                alt={selectedAccount.username}
                className="w-10 h-10 rounded-lg bg-gray-700"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{selectedAccount.username}</p>
                <p className="text-xs text-gray-400">
                  {selectedAccount.type === 'microsoft' ? '正版账号' : '离线账号'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <p className="text-sm">未选择账号</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
