/* global __VAULTED_BUILD_ID__ */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SignConsentForm from './pages/SignConsentForm.jsx'
import { getTheme, setTheme } from './utils/themeHelpers';

setTheme(getTheme()); // applies saved theme on load

// The worker takes control immediately when a new production build is found.
// Reloading only after the controller changes prevents serving a new HTML file
// with stale JavaScript assets.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?build=${__VAULTED_BUILD_ID__}`)
      .catch((error) => console.error('Service worker registration failed:', error))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/sign/:token" element={<SignConsentForm />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
