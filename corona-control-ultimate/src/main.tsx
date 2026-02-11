import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import '@fontsource/outfit' // V7 Hybrid: Local font bundle
import { ErrorHandler } from './utils/ErrorHandler'

// V6 Hybrid: Early Error Capture
ErrorHandler.init();

console.log('--- MAIN.TSX STARTING ---');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
