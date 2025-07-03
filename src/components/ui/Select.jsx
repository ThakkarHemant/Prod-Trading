"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "../icons"

export function Select({ children, value, onValueChange, className = "" }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref])

  // Find the selected item to display its text
  const selectedItem = React.Children.toArray(children)
    .filter((child) => child.type && child.type.name === "SelectContent")
    .flatMap((content) =>
      React.Children.toArray(content.props.children).filter((item) => item.type && item.type.name === "SelectItem"),
    )
    .find((item) => item.props.value === value)

  const selectedLabel = selectedItem ? selectedItem.props.children : ""

  return (
    <div className={`relative ${className}`} ref={ref}>
      {React.Children.map(children, (child) => {
        if (child.type && child.type.name === "SelectTrigger") {
          return React.cloneElement(child, {
            open,
            onClick: () => setOpen(!open),
            selectedLabel,
          })
        }

        if (child.type && child.type.name === "SelectContent") {
          return React.cloneElement(child, {
            open,
            onValueChange,
            onClose: () => setOpen(false),
          })
        }

        return child
      })}
    </div>
  )
}

export function SelectTrigger({ children, className = "", open, onClick, selectedLabel }) {
  return (
    <button
      type="button"
      className={`flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${className}`}
      onClick={onClick}
    >
      <span className="truncate">{selectedLabel || children}</span>
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  )
}

export function SelectContent({ children, className = "", open, onValueChange, onClose }) {
  if (!open) return null

  return (
    <div
      className={`absolute z-50 mt-1 max-h-60 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-800 shadow-lg ${className}`}
    >
      <div className="max-h-60 overflow-auto p-1">
        {React.Children.map(children, (child) => {
          if (child.type && child.type.name === "SelectItem") {
            return React.cloneElement(child, {
              onSelect: (value) => {
                onValueChange(value)
                onClose()
              },
            })
          }

          return child
        })}
      </div>
    </div>
  )
}

export function SelectItem({ children, value, onSelect, className = "" }) {
  return (
    <div
      className={`relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 ${className}`}
      onClick={() => onSelect(value)}
    >
      {children}
    </div>
  )
}

export function SelectValue({ children, placeholder }) {
  return <>{children || placeholder}</>
}
