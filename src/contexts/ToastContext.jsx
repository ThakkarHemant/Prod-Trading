"use client"

import { createContext, useContext, useState } from "react"

const ToastContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  
  const toast = ({ title, description, variant = "default" }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }
  
  const dismiss = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }
  
  return <ToastContext.Provider value={{ toast, toasts, dismiss }}>{children}</ToastContext.Provider>
}