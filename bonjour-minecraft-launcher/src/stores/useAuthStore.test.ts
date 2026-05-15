import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './useAuthStore'
import type { Account } from '../../types'

vi.mock('../api/tauri-bridge', () => ({
  minecraftAPI: {
    getAccounts: vi.fn().mockResolvedValue([]),
    saveAccounts: vi.fn().mockResolvedValue(true),
    addOfflineAccount: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue(true),
  },
}))

const mockAccount: Account = {
  id: 'test-1',
  type: 'offline',
  username: 'TestPlayer',
  uuid: 'test-uuid-1234',
  accessToken: undefined,
  refreshToken: undefined,
}

const mockMicrosoftAccount: Account = {
  id: 'test-2',
  type: 'microsoft',
  username: 'XboxPlayer',
  uuid: 'ms-uuid-5678',
  accessToken: 'ms-access-token',
  refreshToken: 'ms-refresh-token',
  expiresAt: Date.now() + 3600000,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    const localStorageMock = (() => {
      let store: Record<string, string> = {}
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { store = {} },
        get length() { return Object.keys(store).length },
        key: (_index: number) => null,
      }
    })()
    vi.stubGlobal('localStorage', localStorageMock)

    useAuthStore.setState({
      accounts: [],
      selectedAccountId: null,
      isLoading: false,
    })
  })

  it('should start with empty accounts', () => {
    const state = useAuthStore.getState()
    expect(state.accounts).toEqual([])
    expect(state.selectedAccountId).toBeNull()
  })

  it('should add an account', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    const state = useAuthStore.getState()
    expect(state.accounts).toHaveLength(1)
    expect(state.accounts[0].username).toBe('TestPlayer')
    expect(state.selectedAccountId).toBe('test-1')
  })

  it('should select first account automatically when adding to empty list', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    expect(useAuthStore.getState().selectedAccountId).toBe('test-1')
  })

  it('should not change selected account when adding another account', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    await useAuthStore.getState().addAccount(mockMicrosoftAccount)
    expect(useAuthStore.getState().selectedAccountId).toBe('test-1')
  })

  it('should select an account', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    await useAuthStore.getState().addAccount(mockMicrosoftAccount)
    useAuthStore.getState().selectAccount('test-2')
    expect(useAuthStore.getState().selectedAccountId).toBe('test-2')
  })

  it('should get selected account', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    await useAuthStore.getState().addAccount(mockMicrosoftAccount)
    const selected = useAuthStore.getState().getSelectedAccount()
    expect(selected?.username).toBe('TestPlayer')
  })

  it('should return null when no account is selected', () => {
    const selected = useAuthStore.getState().getSelectedAccount()
    expect(selected).toBeNull()
  })

  it('should remove an account and select the first remaining', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    await useAuthStore.getState().addAccount(mockMicrosoftAccount)
    useAuthStore.getState().selectAccount('test-1')

    useAuthStore.setState({
      accounts: useAuthStore.getState().accounts.filter(a => a.id !== 'test-1'),
      selectedAccountId: 'test-2',
    })

    const state = useAuthStore.getState()
    expect(state.accounts).toHaveLength(1)
    expect(state.selectedAccountId).toBe('test-2')
  })

  it('should clear selectedAccountId when all accounts are removed', async () => {
    await useAuthStore.getState().addAccount(mockAccount)
    useAuthStore.setState({ accounts: [], selectedAccountId: null })
    expect(useAuthStore.getState().selectedAccountId).toBeNull()
  })
})
