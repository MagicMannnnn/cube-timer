import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
// DEBUG: clear local data if you visit ?reset
if (new URLSearchParams(location.search).has('reset')) {
  localStorage.removeItem('sessions')
  localStorage.removeItem('currentSessionId')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
