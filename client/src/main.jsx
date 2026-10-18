import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/errorTracker'
import App from './App.jsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary name="RootApplication">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
