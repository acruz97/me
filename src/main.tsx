import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')).render(
  // <>
  //   <App />
  // </>
  <div className="relative w-full min-h-screen">
    {/* <div className="relative z-10 flex items-center justify-center h-full"> */}
    {/* </div> */}
      <App />
  </div>,
)
