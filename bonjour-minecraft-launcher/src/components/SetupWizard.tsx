import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Cpu, HardDrive, MemoryStick, Download, CheckCircle,
  AlertCircle, ChevronRight, Gamepad2, ArrowRight,
  Zap, Globe, Wifi, Sparkles, Clock, User, Key, Coffee
} from 'lucide-react'
import type { LauncherSettings } from '../types'

interface SetupWizardProps {
  onComplete: (settings: Partial<LauncherSettings>) => void
}

type WizardStep = 'welcome' | 'autoSetup' | 'complete'

type AutoSetupTask = {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  message: string
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome')
  const [loginMode, setLoginMode] = useState<'microsoft' | 'offline' | 'littleskin'>('offline')
  const [offlineUsername, setOfflineUsername] = useState('')
  const [setupTasks, setSetupTasks] = useState<AutoSetupTask[]>([
    { id: 'gameDir', label: '创建游戏目录', status: 'pending', message: '' },
    { id: 'java', label: '配置 Java 运行时', status: 'pending', message: '' },
    { id: 'source', label: '检测下载源', status: 'pending', message: '' },
    { id: 'version', label: '安装 Minecraft', status: 'pending', message: '' },
  ])
  const [setupStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [javaDownloadProgress, setJavaDownloadProgress] = useState(0)
  const [javaDownloadMessage, setJavaDownloadMessage] = useState('')
  const [versionInstallProgress, setVersionInstallProgress] = useState('')
  const [setupError, setSetupError] = useState('')
  const [autoSetupResult, setAutoSetupResult] = useState<{
    gameDir: string
    javaPath: string
    needsJavaDownload: boolean
  } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - setupStartTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [setupStartTime])

  useEffect(() => {
    if (step === 'autoSetup') {
      runAutoSetup()
    }
  }, [step])

  useEffect(() => {
    const unlisten = window.minecraftAPI.onJavaDownloadProgress?.((data: any) => {
      setJavaDownloadProgress(data.progress || 0)
      setJavaDownloadMessage(data.message || '')
    })
    return () => { unlisten?.() }
  }, [])

  const updateTask = useCallback((id: string, status: AutoSetupTask['status'], message: string) => {
    setSetupTasks(prev => prev.map(t => t.id === id ? { ...t, status, message } : t))
  }, [])

  const runAutoSetup = async () => {
    try {
      updateTask('gameDir', 'running', '正在创建...')
      const setupResult = await window.minecraftAPI.autoSetup()
      setAutoSetupResult(setupResult)
      updateTask('gameDir', 'done', setupResult.gameDir)

      if (setupResult.needsJavaDownload) {
        updateTask('java', 'running', '正在下载 Java 21...')
        try {
          const javaResult = await window.minecraftAPI.downloadJavaWithProgress(21)
          if (javaResult.success) {
            updateTask('java', 'done', 'Java 21 已安装')
          } else {
            updateTask('java', 'error', 'Java 下载失败，可稍后在设置中手动配置')
          }
        } catch (e) {
          updateTask('java', 'error', 'Java 下载失败，可稍后在设置中手动配置')
        }
      } else {
        updateTask('java', 'done', setupResult.javaPath || '已检测到系统 Java')
      }

      updateTask('source', 'running', '正在检测...')
      try {
        const sources = await window.minecraftAPI.detectDownloadSource()
        const best = sources.find((s: any) => s.available)
        updateTask('source', 'done', best ? `已选择 ${best.name}` : '自动选择')
      } catch {
        updateTask('source', 'done', '自动选择')
      }

      updateTask('version', 'running', '正在安装 Minecraft 1.21.4...')
      try {
        await window.minecraftAPI.installVersion('1.21.4')
        updateTask('version', 'done', 'Minecraft 1.21.4 已安装')
      } catch (e) {
        try {
          await window.minecraftAPI.installVersion('1.20.4')
          updateTask('version', 'done', 'Minecraft 1.20.4 已安装')
        } catch {
          updateTask('version', 'error', '版本安装失败，可稍后在版本管理中安装')
        }
      }

    } catch (e) {
      updateTask('gameDir', 'error', '自动配置失败')
      setSetupError(String(e))
    }
  }

  const handleStartSetup = async () => {
    if (loginMode === 'offline') {
      const username = offlineUsername.trim()
      if (!username) return
      if (username.length < 3 || username.length > 16) {
        setSetupError('用户名长度必须在 3-16 个字符之间')
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setSetupError('用户名只能包含字母、数字和下划线')
        return
      }
    } else if (loginMode === 'microsoft') {
      try {
        await window.minecraftAPI.microsoftLogin()
        return
      } catch (err) {
        setSetupError(String(err))
        return
      }
    } else if (loginMode === 'littleskin') {
      try {
        await window.minecraftAPI.littleskinLogin('', '')
        return
      } catch (err) {
        setSetupError(String(err))
        return
      }
    }
    setStep('autoSetup')
  }

  const handleComplete = () => {
    const setupSettings: Partial<LauncherSettings> = {
      setupCompleted: true,
      gameDir: autoSetupResult?.gameDir,
      javaPath: autoSetupResult?.javaPath,
      downloadSource: 'auto',
      maxMemory: 4096,
      region: 'auto',
    }
    onComplete(setupSettings)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const allDone = setupTasks.every(t => t.status === 'done' || t.status === 'error')
  const hasError = setupTasks.some(t => t.status === 'error')

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-lg px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'welcome' && (
              <WelcomeStep
                loginMode={loginMode}
                setLoginMode={setLoginMode}
                offlineUsername={offlineUsername}
                setOfflineUsername={setOfflineUsername}
                onStart={handleStartSetup}
              />
            )}
            {step === 'autoSetup' && (
              <AutoSetupStep
                tasks={setupTasks}
                javaProgress={javaDownloadProgress}
                javaMessage={javaDownloadMessage}
                allDone={allDone}
                hasError={hasError}
                error={setupError}
                onContinue={() => setStep('complete')}
              />
            )}
            {step === 'complete' && (
              <CompleteStep
                elapsedTime={elapsedTime}
                hasError={hasError}
                onComplete={handleComplete}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="w-3.5 h-3.5" />
          <span>用时 {formatTime(elapsedTime)}</span>
        </div>
      </div>
    </div>
  )
}

function WelcomeStep({
  loginMode, setLoginMode, offlineUsername, setOfflineUsername, onStart
}: {
  loginMode: 'microsoft' | 'offline' | 'littleskin'
  setLoginMode: (v: 'microsoft' | 'offline' | 'littleskin') => void
  offlineUsername: string
  setOfflineUsername: (v: string) => void
  onStart: () => void
}) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, rgba(74, 222, 128, 0.3) 100%)' }}
      >
        <Gamepad2 className="w-10 h-10 text-black" />
      </motion.div>

      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        欢迎使用 Bonjour
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        让我们花 1 分钟完成设置，然后开始游戏
      </p>

      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
          选择登录方式
        </p>
        <div className="space-y-2">
          <button
            onClick={() => setLoginMode('offline')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 transition-all"
            style={loginMode === 'offline' ? { borderColor: 'var(--accent)', borderWidth: '2px' } : {}}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: loginMode === 'offline' ? 'var(--accent-dim)' : 'var(--bg-hover)' }}>
              <User className="w-5 h-5" style={{ color: loginMode === 'offline' ? 'var(--accent)' : 'var(--text-muted)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>离线模式</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>无需账号，输入用户名即可开始</p>
            </div>
            {loginMode === 'offline' && <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
          </button>

          <button
            onClick={() => setLoginMode('microsoft')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 transition-all"
            style={loginMode === 'microsoft' ? { borderColor: 'var(--accent)', borderWidth: '2px' } : {}}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: loginMode === 'microsoft' ? 'var(--accent-dim)' : 'var(--bg-hover)' }}>
              <Key className="w-5 h-5" style={{ color: loginMode === 'microsoft' ? 'var(--accent)' : 'var(--text-muted)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Microsoft 正版登录</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>可加入正版验证服务器</p>
            </div>
            {loginMode === 'microsoft' && <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
          </button>

          <button
            onClick={() => setLoginMode('littleskin')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 transition-all"
            style={loginMode === 'littleskin' ? { borderColor: 'var(--accent)', borderWidth: '2px' } : {}}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: loginMode === 'littleskin' ? 'var(--accent-dim)' : 'var(--bg-hover)' }}>
              <Globe className="w-5 h-5" style={{ color: loginMode === 'littleskin' ? 'var(--accent)' : 'var(--text-muted)' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>LittleSkin 外置登录</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>使用 LittleSkin 皮肤站账号</p>
            </div>
            {loginMode === 'littleskin' && <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
          </button>
        </div>
      </div>

      {loginMode === 'offline' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <input
            type="text"
            value={offlineUsername}
            onChange={(e) => setOfflineUsername(e.target.value)}
            placeholder="输入你的游戏昵称"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && offlineUsername.trim()) onStart() }}
            autoFocus
          />
        </motion.div>
      )}

      {loginMode === 'microsoft' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-3 rounded-xl text-xs text-center"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          将在下一步自动打开 Microsoft 登录页面
        </motion.div>
      )}

      {loginMode === 'littleskin' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-3 rounded-xl text-xs text-center"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          将在下一步打开 LittleSkin 登录页面
        </motion.div>
      )}

      <button
        onClick={onStart}
        disabled={loginMode === 'offline' && !offlineUsername.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        开始配置
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        所有配置将自动完成，你也可以稍后在设置中修改
      </p>
    </div>
  )
}

function AutoSetupStep({
  tasks, javaProgress, javaMessage, allDone, hasError, error, onContinue
}: {
  tasks: AutoSetupTask[]
  javaProgress: number
  javaMessage: string
  allDone: boolean
  hasError: boolean
  error: string
  onContinue: () => void
}) {
  const getTaskIcon = (status: AutoSetupTask['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      case 'running': return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 rounded-full"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent)', borderWidth: '2px' }}
        />
      )
      case 'done': return <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      case 'error': return <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <motion.div
          animate={{ rotate: allDone ? 0 : 360 }}
          transition={{ duration: 2, repeat: allDone ? 0 : Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: allDone
              ? (hasError ? 'rgba(245,158,11,0.15)' : 'var(--accent-dim)')
              : 'var(--bg-hover)'
          }}
        >
          {allDone ? (
            hasError ? <AlertCircle className="w-8 h-8" style={{ color: '#f59e0b' }} /> :
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          ) : (
            <Sparkles className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          )}
        </motion.div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {allDone ? (hasError ? '配置基本完成' : '配置完成！') : '正在自动配置...'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {allDone ? '一切就绪，准备开始游戏' : '请稍候，我们正在为你准备一切'}
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-xl p-3 flex items-center gap-3"
          >
            {getTaskIcon(task.status)}
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {task.label}
              </p>
              {task.message && (
                <p className="text-xs" style={{
                  color: task.status === 'error' ? '#f59e0b' : 'var(--text-muted)'
                }}>
                  {task.id === 'java' && task.status === 'running' && javaMessage
                    ? javaMessage
                    : task.message}
                </p>
              )}
            </div>
            {task.id === 'java' && task.status === 'running' && javaProgress > 0 && (
              <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                {javaProgress}%
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {tasks.find(t => t.id === 'java')?.status === 'running' && javaProgress > 0 && (
        <div className="mb-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={{ width: `${javaProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {allDone && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            继续
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  )
}

function CompleteStep({
  elapsedTime, hasError, onComplete
}: {
  elapsedTime: number
  hasError: boolean
  onComplete: () => void
}) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'var(--accent)' }}
      >
        <CheckCircle className="w-10 h-10 text-black" />
      </motion.div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        一切就绪！
      </h2>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        设置用时 {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
      </p>
      {hasError && (
        <p className="text-xs mb-4" style={{ color: '#f59e0b' }}>
          部分配置未完成，你可以在设置中手动调整
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 my-6">
        {[
          { icon: Gamepad2, title: '启动游戏', desc: '在首页一键启动' },
          { icon: Download, title: '安装模组', desc: '浏览海量模组' },
          { icon: Globe, title: '多人联机', desc: '与好友一起玩' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass rounded-xl p-4"
          >
            <item.icon className="w-6 h-6 mb-2" style={{ color: 'var(--accent)' }} />
            <h3 className="font-semibold text-xs mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        <Gamepad2 className="w-4 h-4" />
        开始使用 Bonjour
      </button>
    </div>
  )
}
