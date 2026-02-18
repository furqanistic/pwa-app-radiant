// File: client/src/main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import App from './App.jsx'
import { axiosInstance } from './config'
import './index.css'
import { persistor, store } from './redux/store.js'
import { logout } from './redux/userSlice'

const queryClient = new QueryClient()

// Global 401 handler to clear Redux and redirect
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isAuthSignin = requestUrl.includes('/auth/signin')
    const isIntegrationEndpoint = requestUrl.includes('/ghl/')

    if (error.response?.status === 401 && !isAuthSignin && !isIntegrationEndpoint) {
      store.dispatch(logout())
    }
    return Promise.reject(error)
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  </StrictMode>
)
