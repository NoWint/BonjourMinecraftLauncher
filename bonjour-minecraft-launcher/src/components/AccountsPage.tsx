import { useState, useRef } from 'react'
import { User, Plus, Trash2, Check, X, Loader2, ExternalLink, Upload, Image, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Account } from '../types'

interface AccountsPageProps {
  accounts: Account[]
  selectedAccount: Account | null
  onSelect: (account: Account) => void
  onAdd: (username: string) => Promise<Account>
  onDelete: (accountId: string) => void
  onAccountsChange: () => void
}

type AddMode = 'offline' | 'microsoft' | 'littleskin'

export default function AccountsPage({ accounts, selectedAccount, onSelect, onAdd, onDelete, onAccountsChange }: AccountsPageProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('offline')
  const [newUsername, setNewUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState('')

  const validateUsername = (name: string): string | null => {
    if (!name) return null
    if (name.length < 3 || name.length > 16) return '用户名长度应为 3-16 个字符'
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return '用户名只能包含字母、数字和下划线'
    return null
  }

  const handleAddOffline = async () => {
    const name = newUsername.trim()
    if (!name) return
    const validationError = validateUsername(name)
    if (validationError) {
      setNameError(validationError)
      return
    }
    setNameError('')
    setIsSubmitting(true)
    try {
      await onAdd(newUsername.trim())
      setNewUsername('')
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to add account:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAvatarUpload = async (account: Account) => {
    try {
      const imagePath = await window.minecraftAPI.selectImageFile()
      if (imagePath) {
        await window.minecraftAPI.uploadAvatar(account.id, imagePath)
        onAccountsChange()
      }
    } catch (err) {
      console.error('Upload avatar failed:', err)
    }
  }

  const handleSkinUpload = async (account: Account) => {
    if (account.type !== 'microsoft' || !account.accessToken) {
      alert('仅支持Microsoft正版账户上传皮肤')
      return
    }
    try {
      const skinPath = await window.minecraftAPI.selectSkinFile()
      if (skinPath) {
        const result = await window.minecraftAPI.uploadSkin(account.accessToken, skinPath, 'classic')
        if (result.success) {
          alert('皮肤上传成功！')
          onAccountsChange()
        } else {
          alert(`皮肤上传失败: ${result.error}`)
        }
      }
    } catch (err) {
      console.error('Upload skin failed:', err)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">账户</h2>
          <button
            onClick={() => { setIsAdding(true); setAddMode('offline') }}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {accounts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">还没有账户</h3>
              <p className="text-white/40 mb-6">添加一个账户开始游戏</p>
              <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors">
                添加账户
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="max-w-lg mx-auto space-y-3">
            {selectedAccount && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 mb-6 text-center">
                <div className="relative inline-block mb-4 group">
                  <img
                    src={selectedAccount.avatarUrl || selectedAccount.skinUrl || `https://crafatar.com/avatars/${selectedAccount.uuid}?size=128&overlay`}
                    alt={selectedAccount.username}
                    className="w-24 h-24 rounded-2xl bg-white/5 object-cover"
                  />
                  <button
                    onClick={() => handleAvatarUpload(selectedAccount)}
                    className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Upload className="w-6 h-6 text-white" />
                  </button>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-mc-green flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{selectedAccount.username}</h3>
                <p className="text-white/40 text-sm mb-3">
                  {selectedAccount.type === 'microsoft' ? 'Microsoft 正版账户' : selectedAccount.type === 'littleskin' ? 'Littleskin 皮肤站' : '离线账户'}
                </p>
                {selectedAccount.type === 'microsoft' && (
                  <button
                    onClick={() => handleSkinUpload(selectedAccount)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-medium hover:bg-mc-green/25 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    上传皮肤
                  </button>
                )}
              </motion.div>
            )}

            <h3 className="text-sm font-medium text-white/40 mb-3 uppercase tracking-wider">所有账户</h3>
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id
              return (
                <motion.div
                  key={account.id}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(account)}
                  className={`glass rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    isSelected ? 'border-mc-green/30 bg-mc-green/5' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative group">
                    <img
                      src={account.avatarUrl || account.skinUrl || `https://crafatar.com/avatars/${account.uuid}?size=64&overlay`}
                      alt={account.username}
                      className="w-12 h-12 rounded-xl bg-white/5 object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAvatarUpload(account) }}
                      className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Image className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-white truncate">{account.username}</h4>
                    <p className="text-sm text-white/40">
                      {account.type === 'microsoft' ? 'Microsoft' : account.type === 'littleskin' ? 'Littleskin' : '离线'}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-mc-green flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(account.id) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            onClick={() => setIsAdding(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass-strong rounded-2xl p-8 w-full max-w-md"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">添加账户</h3>
                <button onClick={() => setIsAdding(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                {([
                  { mode: 'offline' as AddMode, label: '离线' },
                  { mode: 'microsoft' as AddMode, label: 'Microsoft' },
                  { mode: 'littleskin' as AddMode, label: 'Littleskin' },
                ]).map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setAddMode(mode)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      addMode === mode
                        ? 'bg-mc-green/15 text-mc-green border border-mc-green/25'
                        : 'glass text-white/50 hover:text-white/70'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {addMode === 'offline' && (
                  <motion.div key="offline" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">玩家名称</label>
                      <input type="text" value={newUsername} onChange={e => { setNewUsername(e.target.value); setNameError('') }}
                        placeholder="输入玩家名称 (3-16位字母/数字/下划线)"
                        className="w-full px-4 py-3 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                        onKeyDown={e => e.key === 'Enter' && handleAddOffline()} autoFocus />
                      {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
                    </div>
                    <button onClick={handleAddOffline} disabled={!newUsername.trim() || isSubmitting}
                      className="w-full py-3 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? '添加中...' : '添加'}
                    </button>
                  </motion.div>
                )}

                {addMode === 'microsoft' && (
                  <MicrosoftLoginFlow onAccountsChange={onAccountsChange} onClose={() => setIsAdding(false)} />
                )}

                {addMode === 'littleskin' && (
                  <LittleskinLoginFlow onAccountsChange={onAccountsChange} onClose={() => setIsAdding(false)} />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MicrosoftLoginFlow({ onAccountsChange, onClose }: { onAccountsChange: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'getting_code' | 'waiting' | 'polling' | 'done' | 'error'>('idle')
  const [userCode, setUserCode] = useState('')
  const [verificationUrl, setVerificationUrl] = useState('')
  const [_deviceCode, setDeviceCode] = useState('')
  const [error, setError] = useState('')
  const pollCountRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxPolls = 30
  const maxTimeoutMs = 300000

  const startLogin = async () => {
    setStatus('getting_code')
    setError('')
    try {
      const result = await window.minecraftAPI.microsoftLoginStart()
      if (result.success && result.userCode && result.deviceCode) {
        setUserCode(result.userCode)
        setVerificationUrl(result.verificationUrl || 'https://microsoft.com/link')
        setDeviceCode(result.deviceCode)
        setStatus('waiting')
        startPolling(result.deviceCode, result.interval || 5)
      } else {
        setError(result.error || '获取设备码失败')
        setStatus('error')
      }
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const startPolling = (code: string, interval: number) => {
    setStatus('polling')
    pollCountRef.current = 0

    const totalTimeout = setTimeout(() => {
      clearTimers()
      setError('登录超时（5分钟），请重试')
      setStatus('error')
    }, maxTimeoutMs)
    timeoutRef.current = totalTimeout

    const poll = async () => {
      pollCountRef.current++
      if (pollCountRef.current > maxPolls) {
        clearTimers()
        setError('登录超时，请重试')
        setStatus('error')
        return
      }
      try {
        const result = await window.minecraftAPI.microsoftLoginPoll(code)
        if (result.success && result.account) {
          clearTimers()
          setStatus('done')
          onAccountsChange()
          setTimeout(onClose, 1500)
          return
        }
        if (result.error === 'authorization_pending' || result.error === 'slow_down') {
          clearTimers()
          const delay = (interval + (result.error === 'slow_down' ? 5 : 0)) * 1000
          const nextPoll = setTimeout(poll, delay)
          timeoutRef.current = nextPoll
          return
        }
        clearTimers()
        setError(result.error || '登录失败')
        setStatus('error')
      } catch (err: any) {
        clearTimers()
        setError(err.message)
        setStatus('error')
      }
    }
    const initialPoll = setTimeout(poll, interval * 1000)
    timeoutRef.current = initialPoll
  }

  const copyCode = () => {
    navigator.clipboard.writeText(userCode)
  }

  return (
    <motion.div key="microsoft" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
      {status === 'idle' && (
        <>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>
            </div>
            <p className="text-white/60 text-sm mb-4">使用 Microsoft 账户登录以获取正版皮肤和在线游戏权限</p>
          </div>
          <button onClick={startLogin} className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-500/90 transition-colors flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            开始 Microsoft 登录
          </button>
        </>
      )}

      {(status === 'getting_code' || status === 'waiting' || status === 'polling') && (
        <div className="text-center py-4 space-y-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <div>
            <p className="text-white font-medium mb-2">请在浏览器中完成登录</p>
            <p className="text-white/40 text-sm mb-4">在打开的页面中输入以下代码：</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <code className="px-4 py-2 bg-white/10 rounded-lg text-xl font-mono text-white tracking-widest">{userCode}</code>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="复制代码">
                <Copy className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <button
              onClick={() => window.minecraftAPI.openExternal(verificationUrl)}
              className="text-blue-400 text-sm underline hover:text-blue-300 transition-colors"
            >
              打开登录页面
            </button>
          </div>
          {status === 'polling' && <p className="text-white/30 text-xs">等待登录完成...</p>}
        </div>
      )}

      {status === 'done' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-mc-green/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-mc-green" />
          </div>
          <p className="text-mc-green font-medium">登录成功！</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-4 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={startLogin} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm">
            重试
          </button>
        </div>
      )}
    </motion.div>
  )
}

function LittleskinLoginFlow({ onAccountsChange, onClose }: { onAccountsChange: () => void; onClose: () => void }) {
  const [serverUrl, setServerUrl] = useState('https://littleskin.cn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!serverUrl.trim() || !email.trim() || !password.trim()) return
    setIsLogging(true)
    setError('')
    try {
      const result = await window.minecraftAPI.littleskinLogin(serverUrl.trim(), email.trim(), password)
      if (result.success) {
        onAccountsChange()
        onClose()
      } else {
        setError(result.error || '登录失败')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <motion.div key="littleskin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">皮肤站地址</label>
        <input type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)}
          placeholder="https://littleskin.cn"
          className="w-full px-4 py-3 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">邮箱</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="输入密码"
          className="w-full px-4 py-3 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={handleLogin} disabled={isLogging || !email.trim() || !password.trim()}
        className="w-full py-3 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isLogging ? '登录中...' : '登录'}
      </button>
      <p className="text-white/30 text-xs text-center">登录后将自动同步皮肤站角色信息</p>
    </motion.div>
  )
}
