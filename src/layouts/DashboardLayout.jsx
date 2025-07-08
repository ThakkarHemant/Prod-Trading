
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
  const [isSidebarOpen, setSidebarOpen] = useState(false) // Default closed on mobile
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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {firstInitial}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{nameSource}</span>
              <span className="text-xs text-gray-500 capitalize">{user.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 
        ${isMobile ? "w-80" : isSidebarOpen ? "w-64" : "w-20"}
        ${isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"}
        transition-all duration-300 ease-in-out
        bg-white border-r border-gray-200 flex flex-col
      `}
      >
        {/* Desktop Sidebar Header */}
        <div className={`border-b border-gray-200 p-4 ${isMobile ? "hidden" : "block"}`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {firstInitial}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-gray-900 truncate">{nameSource}</span>
                <span className="text-sm text-gray-500 capitalize">{user.role}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Header */}
        <div className={`border-b border-gray-200 p-4 ${isMobile ? "block" : "hidden"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {firstInitial}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{nameSource}</span>
                <span className="text-sm text-gray-500 capitalize">{user.role}</span>
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <a
              key={item.title}
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
              <item.icon className={`h-5 w-5 flex-shrink-0 ${!isSidebarOpen && !isMobile ? "mx-auto" : "mr-3"}`} />
              {(isSidebarOpen || isMobile) && <span className="truncate">{item.title}</span>}
            </a>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className={`
              flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 
              hover:bg-gray-100 hover:text-gray-900 transition-colors
              ${!isSidebarOpen && !isMobile ? "justify-center" : ""}
            `}
          >
            <LogOut className={`h-5 w-5 flex-shrink-0 ${!isSidebarOpen && !isMobile ? "" : "mr-3"}`} />
            {(isSidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>

        {/* Desktop Toggle Button */}
        {!isMobile && (
          <button
            className="absolute -right-3 top-6 bg-white rounded-full border border-gray-300 shadow-sm p-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className={`transition-transform text-gray-600 ${isSidebarOpen ? "rotate-0" : "rotate-180"}`}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen ${isMobile ? "pt-16" : ""}`}>
        <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
