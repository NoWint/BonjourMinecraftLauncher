import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { minecraftAPI, windowAPI, setupEventListeners } from './api/tauri-bridge'

declare global {
  interface Window {
    minecraftAPI: typeof minecraftAPI
    windowAPI: typeof windowAPI
    setupEventListeners: typeof setupEventListeners
  }
}

window.minecraftAPI = minecraftAPI
window.windowAPI = windowAPI
window.setupEventListeners = setupEventListeners

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
