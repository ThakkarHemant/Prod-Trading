"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Search } from "../../components/icons"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"

function AdminTrades() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusMapping = {
    'completed': 'CLOSED',
    'active': 'ACTIVE', 
    'pending': 'PENDING',
    'open': 'ACTIVE',
    'closed': 'CLOSED'
  }

  const normalizeStatus = (status) => statusMapping[status.toLowerCase()] || status.toUpperCase()

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const response = await fetch("/api/trades/history", {
          headers: {
            'X-User-ID': currentUser.id,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch trades")
        }
        
        const data = await response.json()
        if (data.success) {
          const tradesWithPnL = (data.trades || []).map(trade => {
            let pnl = trade.pnl
            if (normalizeStatus(trade.status) === "CLOSED" && trade.exit_price) {
              pnl = trade.action === "BUY" 
                ? (trade.exit_price - trade.price) * trade.quantity
                : (trade.price - trade.exit_price) * trade.quantity
            }
            return { 
              ...trade, 
              pnl,
              instrument_display: trade.instrument_key 
            }
          })
          setTrades(tradesWithPnL)
        } else {
          throw new Error(data.error || "Failed to fetch trades")
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [])

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = searchTerm === "" || 
      trade.instrument_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.user_id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.users && trade.users.name?.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || normalizeStatus(trade.status) === statusFilter.toUpperCase()
    const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesType
  })

  const activeTrades = trades.filter((trade) => normalizeStatus(trade.status) === "ACTIVE")
  const closedTrades = trades.filter((trade) => normalizeStatus(trade.status) === "CLOSED")
  const pendingTrades = trades.filter((trade) => normalizeStatus(trade.status) === "PENDING")

  const totalProfit = closedTrades.reduce((sum, trade) => sum + ((trade.pnl || 0) > 0 ? (trade.pnl || 0) : 0), 0)
  const totalLoss = closedTrades.reduce((sum, trade) => sum + ((trade.pnl || 0) < 0 ? Math.abs(trade.pnl || 0) : 0), 0)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="text-center text-red-500 p-4">
            Error loading trades: {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade Management</h1>
        <p className="text-gray-500">Monitor and manage all user trading activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Trades</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Active Trades</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{activeTrades.length}</div>
            <p className="text-xs text-gray-500">Currently open positions</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Profit</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold text-emerald-500">${totalProfit.toFixed(2)}</div>
            <p className="text-xs text-gray-500">From closed trades</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Loss</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold text-red-500">${totalLoss.toFixed(2)}</div>
            <p className="text-xs text-gray-500">From closed trades</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search by user, ID or instrument..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full sm:w-[250px]"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Trades</h3>
            <p className="card-description">Complete trading history across all users</p>
          </div>
          <div className="card-content">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="min-w-[100px]">Trade ID</th>
                      <th className="min-w-[100px]">User ID</th>
                      <th className="min-w-[150px]">User</th>
                      <th className="min-w-[150px]">Instrument</th>
                      <th className="min-w-[80px]">Type</th>
                      <th className="min-w-[90px]">Status</th>
                      <th className="min-w-[90px]">Quantity</th>
                      <th className="min-w-[100px]">Entry Price</th>
                      <th className="min-w-[80px]">P&L</th>
                      <th className="min-w-[150px]">Entry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8">
                          No trades found
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((trade) => (
                        <tr key={trade.trade_id}>
                          <td>{trade.trade_id}</td>
                          <td>{trade.user_id}</td>
                          <td className="font-medium">
                            <div className="max-w-[130px] truncate">
                              {trade.users?.name || `User ${trade.user_id}`}
                            </div>
                          </td>
                          <td className="font-medium">
                            <div className="max-w-[150px] truncate">
                              {trade.instrument_key || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trade.action?.toUpperCase() === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {trade.action?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                normalizeStatus(trade.status) === "ACTIVE" ? "bg-blue-100 text-blue-800" :
                                normalizeStatus(trade.status) === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {normalizeStatus(trade.status)}
                            </span>
                          </td>
                          <td>{trade.quantity}</td>
                          <td>${trade.price?.toFixed(2) || 'N/A'}</td>
                          <td className={trade.pnl && trade.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                            {trade.pnl ? `${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}` : "-"}
                          </td>
                          <td className="text-sm">{formatDate(trade.timestamp)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTrades