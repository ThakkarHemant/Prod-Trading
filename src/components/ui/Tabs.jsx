"use client"

import React, { useState } from "react"

export function Tabs({ defaultValue, children, className = "" }) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  const tabList = React.Children.toArray(children).filter((child) => child.type && child.type.name === "TabsList")

  const tabContent = React.Children.toArray(children).filter((child) => child.type && child.type.name === "TabsContent")

  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(tabList, (child) => React.cloneElement(child, { activeTab, setActiveTab }))}

      {React.Children.map(tabContent, (child) => React.cloneElement(child, { activeTab }))}
    </div>
  )
}

export function TabsList({ children, activeTab, setActiveTab, className = "" }) {
  return (
    <div className={`tabs flex ${className}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          isActive: activeTab === child.props.value,
          onSelect: () => setActiveTab(child.props.value),
        }),
      )}
    </div>
  )
}

export function TabsTrigger({ children, value, isActive, onSelect, className = "" }) {
  return (
    <button className={`tab ${isActive ? "tab-active" : ""} ${className}`} onClick={onSelect}>
      {children}
    </button>
  )
}

export function TabsContent({ children, value, activeTab, className = "" }) {
  if (value !== activeTab) return null

  return <div className={`tab-panel ${className}`}>{children}</div>
}
