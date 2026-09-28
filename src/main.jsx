import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme.jsx'
import '@rainbow-me/rainbowkit/styles.css'
import App from './App.jsx'
import { config } from './wagmi-config.js'
import { I18nProvider } from './i18n/index.jsx'
import './index.css'
import './design.css'
import './actions.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </I18nProvider>
  </React.StrictMode>,
)