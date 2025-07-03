"use client"

import React, { createContext, useContext, useEffect } from "react"

const DialogContext = createContext({
  open: false,
  onOpenChange: () => {},
})

export function Dialog({ children, open, onOpenChange }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children, asChild }) {
  const { onOpenChange } = useContext(DialogContext)

  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e) => {
        e.preventDefault()
        onOpenChange(true)

        // Call the original onClick if it exists
        if (children.props.onClick) {
          children.props.onClick(e)
        }
      },
    })
  }

  return <button onClick={() => onOpenChange(true)}>{children}</button>
}

export function DialogContent({ children, className = "" }) {
  const { open, onOpenChange } = useContext(DialogContext)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="fixed inset-0 z-50" onClick={() => onOpenChange(false)}></div>
      <div
        className={`z-50 bg-white rounded-lg shadow-lg max-w-md w-full max-h-[85vh] overflow-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, className = "" }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function DialogTitle({ children, className = "" }) {
  return <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>
}

export function DialogDescription({ children, className = "" }) {
  return <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>
}

export function DialogFooter({ children, className = "" }) {
  return <div className={`flex justify-end space-x-2 px-6 py-4 border-t ${className}`}>{children}</div>
}
