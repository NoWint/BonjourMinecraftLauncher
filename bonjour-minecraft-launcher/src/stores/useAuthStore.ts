import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '../types'
import { minecraftAPI } from '../api/tauri-bridge'

interface AuthState {
  accounts: Account[]
  selectedAccountId: string | null
  isLoading: boolean

  loadAccounts: () => Promise<void>
  addAccount: (account: Account) => Promise<void>
  removeAccount: (accountId: string) => Promise<void>
  selectAccount: (accountId: string) => void
  getSelectedAccount: () => Account | null
  addOfflineAccount: (username: string) => Promise<Account>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,
      isLoading: false,

      loadAccounts: async () => {
        set({ isLoading: true })
        try {
          const accounts = await minecraftAPI.getAccounts()
          set({
            accounts,
            selectedAccountId: accounts.length > 0 ? accounts[0].id : null,
            isLoading: false,
          })
        } catch {
          set({ isLoading: false })
        }
      },

      addAccount: async (account) => {
        await minecraftAPI.saveAccounts([account])
        set((state) => {
          const accounts = [...state.accounts, account]
          return {
            accounts,
            selectedAccountId: state.selectedAccountId || account.id,
          }
        })
      },

      removeAccount: async (accountId) => {
        await minecraftAPI.deleteAccount(accountId)
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== accountId)
          return {
            accounts,
            selectedAccountId:
              state.selectedAccountId === accountId
                ? accounts[0]?.id || null
                : state.selectedAccountId,
          }
        })
      },

      selectAccount: (accountId) => {
        set({ selectedAccountId: accountId })
      },

      getSelectedAccount: () => {
        const { accounts, selectedAccountId } = get()
        return accounts.find((a) => a.id === selectedAccountId) || null
      },

      addOfflineAccount: async (username) => {
        const account = await minecraftAPI.addOfflineAccount(username)
        get().addAccount(account)
        return account
      },
    }),
    {
      name: 'bonjour-auth',
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
      }),
    }
  )
)
