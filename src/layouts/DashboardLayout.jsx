/*
"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  Eye,
  LineChart,
  LogOut,
  Settings,
  Users,
} from "../components/icons"

function DashboardLayout({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("currentUser")
    return storedUser ? JSON.parse(storedUser) : null
  })
  const name = localStorage.getItem("name") 
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const nameSource = name || user?.name || user?.id || "User"
  const firstInitial = nameSource.charAt(0).toUpperCase()

  useEffect(() => {
    if (!user) {
      navigate("/")
      return
    }

    if (user.role === "admin" && pathname.startsWith("/user")) {
      navigate("/admin/overview")
    } else if (user.role === "user" && pathname.startsWith("/admin")) {
      navigate("/user/watchlist")
    }
  }, [pathname, user, navigate])

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    navigate("/")
  }

  const adminMenuItems = [
    { title: "Overview", icon: BarChart3, path: "/admin/overview" },
    { title: "User Management", icon: Users, path: "/admin/users" },
    { title: "Watchlist Management", icon: Eye, path: "/admin/watchlist" },
    { title: "Trade Management", icon: LineChart, path: "/admin/trades" },
    { title: "Deposit/Withdraw", icon: DollarSign, path: "/admin/transactions" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ]

  const userMenuItems = [
    { title: "Watchlist", icon: Eye, path: "/user/watchlist" },
    { title: "Trades", icon: Activity, path: "/user/trades" },
    { title: "Portfolio", icon: LineChart, path: "/user/portfolio" },
    { title: "Deposit/Withdraw", icon: CreditCard, path: "/user/transactions" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : userMenuItems

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      {/* Sidebar }
      <aside className={`sidebar min-h-screen ${isSidebarOpen ? "w-64" : "w-20"} transition-all duration-300`}>
        {/* Sidebar Header }
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {firstInitial}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-medium">{nameSource}</span>
                <span className="text-xs text-gray-500 capitalize">{user.role}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Menu }
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.title}>
                <a
                  href={item.path}
                  className={`flex items-center rounded-md px-3 py-2 text-sm ${
                    pathname === item.path
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {isSidebarOpen && <span>{item.title}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer }
        <div className="mt-auto border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Sidebar Toggle }
        <button
          className="absolute top-4 right-0 translate-x-1/2 bg-white rounded-full border shadow-sm p-1"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${isSidebarOpen ? "rotate-0" : "rotate-180"}`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </aside>

      {/* Main Content }
      <div className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
*/

"use client"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  Eye,
  LineChart,
  LogOut,
  Settings,
  Users,
  Menu,
  X,
} from "../components/icons"

function DashboardLayout({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("currentUser")
    return storedUser ? JSON.parse(storedUser) : null
  })
  const name = localStorage.getItem("name")
  const [isSidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const nameSource = name || user?.name || user?.id || "User"
  const firstInitial = nameSource.charAt(0).toUpperCase()

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(true) // Auto-open on desktop
      } else {
        setSidebarOpen(false) // Auto-close on mobile
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate("/")
      return
    }
    if (user.role === "admin" && pathname.startsWith("/user")) {
      navigate("/admin/overview")
    } else if (user.role === "user" && pathname.startsWith("/admin")) {
      navigate("/user/watchlist")
    }
  }, [pathname, user, navigate])

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    navigate("/")
  }

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const adminMenuItems = [
    { title: "Overview", icon: BarChart3, path: "/admin/overview" },
    { title: "User Management", icon: Users, path: "/admin/users" },
    { title: "Watchlist Management", icon: Eye, path: "/admin/watchlist" },
    { title: "Trade Management", icon: LineChart, path: "/admin/trades" },
    { title: "Deposit/Withdraw", icon: DollarSign, path: "/admin/transactions" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ]

  const userMenuItems = [
    { title: "Watchlist", icon: Eye, path: "/user/watchlist" },
    { title: "Trades", icon: Activity, path: "/user/trades" },
    { title: "Portfolio", icon: LineChart, path: "/user/portfolio" },
    { title: "Deposit/Withdraw", icon: CreditCard, path: "/user/transactions" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : userMenuItems

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${isMobile ? "w-64" : isSidebarOpen ? "w-64" : "w-20"}
          bg-white border-r border-gray-200 shadow-lg lg:shadow-none
          transform transition-all duration-300 ease-in-out
          ${isMobile ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {firstInitial}
              </div>
              {(isSidebarOpen || isMobile) && (
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 text-sm">{nameSource}</span>
                  <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                </div>
              )}
            </div>

            {/* Close button for mobile */}
            {isMobile && (
              <button
                onClick={closeSidebar}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                <a
                  href={item.path}
                  onClick={closeSidebar}
                  className={`
                    flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${
                      pathname === item.path
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {(isSidebarOpen || isMobile) && <span className="ml-3 truncate">{item.title}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {(isSidebarOpen || isMobile) && <span className="ml-3">Logout</span>}
          </button>
        </div>

        {/* Desktop Sidebar Toggle */}
        {!isMobile && (
          <button
            className="absolute -right-3 top-6 bg-white rounded-full border border-gray-200 shadow-sm p-1.5 hover:bg-gray-50 transition-colors"
            onClick={toggleSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${isSidebarOpen ? "rotate-0" : "rotate-180"}`}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen ${!isMobile && !isSidebarOpen ? "lg:ml-20" : ""}`}>
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
              {firstInitial}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 text-sm">{nameSource}</span>
              <span className="text-xs text-gray-500 capitalize">{user.role}</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
