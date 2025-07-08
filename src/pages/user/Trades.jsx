/*
"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Search } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"

function UserTrades() {
  const [searchTerm, setSearchTerm] = useState("")
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
        
        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        const response = await fetch("/api/trades/history", {
          headers: {
            'X-User-ID': currentUser.id,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch trades");
        }

        const data = await response.json();
        if (data.success) {
          const tradesWithPnL = (data.trades || []).map(trade => {
            let pnl = trade.pnl;
            if (normalizeStatus(trade.status) === "CLOSED" && trade.exit_price) {
              pnl = trade.action === "BUY" 
                ? (trade.exit_price - trade.price) * trade.quantity
                : (trade.price - trade.exit_price) * trade.quantity;
            }
            return { 
              ...trade, 
              pnl,
              // Add instrument display name based on what's available
              instrument_display: trade.instrument_key || 'Unknown'
            };
          });
          setTrades(tradesWithPnL);
        } else {
          throw new Error(data.error || "Failed to fetch trades");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const pendingTrades = trades.filter(trade => normalizeStatus(trade.status) === "PENDING")
  const activeTrades = trades.filter(trade => normalizeStatus(trade.status) === "ACTIVE")
  const closedTrades = trades.filter(trade => normalizeStatus(trade.status) === "CLOSED")

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = searchTerm === "" || 
      trade.instrument_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.instrument_display?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()
    return matchesSearch && matchesType
  })

  const totalProfit = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) > 0 ? (trade.pnl || 0) : 0), 0)
  const totalLoss = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) < 0 ? Math.abs(trade.pnl || 0) : 0), 0)
  const netPnL = totalProfit - totalLoss

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "-"
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
      {/* Header and Stats }
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
        <p className="text-gray-500">Manage your trading positions</p>
      </div>
 
      {/* Search and Filter }
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search by instrument..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full sm:w-[250px]"
            />
          </div>
          <div className="flex gap-2">
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

        {/* All Trades Table }
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Trades</h3>
            <p className="card-description">Your complete trading history</p>
          </div>
          <div className="card-content">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="min-w-[150px]">Instrument</th>
                      <th className="min-w-[80px]">Type</th>
                      <th className="min-w-[90px]">Status</th>
                      <th className="min-w-[90px]">Quantity</th>
                      <th className="min-w-[100px]">Entry Price</th>
                      <th className="min-w-[150px]">Entry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          No trades found
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map(trade => (
                        <tr key={trade.trade_id}>
                          <td className="font-medium">
                            <div className="max-w-[150px] truncate">
                              {trade.instrument_display}
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

export default UserTrades
*/
"use client"
import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Search } from "../../components/icons"

function UserTrades() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusMapping = {
    completed: "CLOSED",
    active: "ACTIVE",
    pending: "PENDING",
    open: "ACTIVE",
    closed: "CLOSED",
  }

  const normalizeStatus = (status) => statusMapping[status.toLowerCase()] || status.toUpperCase()

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"))

        if (!currentUser) {
          throw new Error("User not authenticated")
        }

        const response = await fetch("/api/trades/history", {
          headers: {
            "X-User-ID": currentUser.id,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch trades")
        }

        const data = await response.json()

        if (data.success) {
          const tradesWithPnL = (data.trades || []).map((trade) => {
            let pnl = trade.pnl
            if (normalizeStatus(trade.status) === "CLOSED" && trade.exit_price) {
              pnl =
                trade.action === "BUY"
                  ? (trade.exit_price - trade.price) * trade.quantity
                  : (trade.price - trade.exit_price) * trade.quantity
            }

            return {
              ...trade,
              pnl,
              // Add instrument display name based on what's available
              instrument_display: trade.instrument_key || "Unknown",
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

  const pendingTrades = trades.filter((trade) => normalizeStatus(trade.status) === "PENDING")
  const activeTrades = trades.filter((trade) => normalizeStatus(trade.status) === "ACTIVE")
  const closedTrades = trades.filter((trade) => normalizeStatus(trade.status) === "CLOSED")

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch =
      searchTerm === "" ||
      trade.instrument_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.instrument_display?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()

    return matchesSearch && matchesType
  })

  const totalProfit = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) > 0 ? trade.pnl || 0 : 0), 0)
  const totalLoss = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) < 0 ? Math.abs(trade.pnl || 0) : 0), 0)
  const netPnL = totalProfit - totalLoss

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "-"
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center text-red-600 font-bold mb-2">Error loading trades: {error}</div>
          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Trades</h1>
        <p className="text-gray-500 text-sm lg:text-base">Manage your trading positions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Trades */}
        <div className="p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Trades</h3>
            <ArrowUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl lg:text-2xl font-bold mb-1">{trades.length}</div>
          <p className="text-xs text-gray-500">All time</p>
        </div>

        {/* Active Trades */}
        <div className="p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="text-xl lg:text-2xl font-bold mb-1">{activeTrades.length}</div>
          <p className="text-xs text-gray-500">Open positions</p>
        </div>

        {/* Total Profit */}
        <div className="p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Profit</h3>
            <ArrowUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-xl lg:text-2xl font-bold mb-1 text-green-600">🪙{totalProfit.toFixed(2)}</div>
          <p className="text-xs text-gray-500">Realized gains</p>
        </div>

        {/* Net P&L */}
        <div className="p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Net P&L</h3>
            {netPnL >= 0 ? (
              <ArrowUp className="w-4 h-4 text-green-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className={`text-xl lg:text-2xl font-bold mb-1 ${netPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
            {netPnL >= 0 ? "+" : ""}🪙{netPnL.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500">Overall performance</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search by instrument..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
      </div>

      {/* All Trades Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 lg:p-6 border-b">
          <h3 className="text-lg font-bold mb-2">All Trades</h3>
          <p className="text-sm text-gray-600">Your complete trading history</p>
        </div>

        <div className="overflow-hidden">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No trades found</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instrument
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrades.map((trade) => (
                      <tr key={trade.trade_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          <div className="max-w-[150px] truncate">{trade.instrument_display}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              trade.action?.toUpperCase() === "BUY"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.action?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              normalizeStatus(trade.status) === "ACTIVE"
                                ? "bg-blue-100 text-blue-800"
                                : normalizeStatus(trade.status) === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {normalizeStatus(trade.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{trade.quantity}</td>
                        <td className="px-4 py-3 text-right">🪙{trade.price?.toFixed(2) || "N/A"}</td>
                        <td className="px-4 py-3 text-center text-sm">{formatDate(trade.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tablet Horizontal Scroll View */}
              <div className="hidden sm:block lg:hidden overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instrument</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrades.map((trade) => (
                      <tr key={trade.trade_id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-sm">
                          <div className="max-w-[120px] truncate">{trade.instrument_display}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              trade.action?.toUpperCase() === "BUY"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {trade.action?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              normalizeStatus(trade.status) === "ACTIVE"
                                ? "bg-blue-100 text-blue-800"
                                : normalizeStatus(trade.status) === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {normalizeStatus(trade.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm">{trade.quantity}</td>
                        <td className="px-3 py-3 text-right text-sm">🪙{trade.price?.toFixed(2) || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden">
                {filteredTrades.map((trade) => (
                  <div key={trade.trade_id} className="border-b border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base truncate">{trade.instrument_display}</div>
                        <div className="text-sm text-gray-500 mt-1">{formatDate(trade.timestamp)}</div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="font-bold text-lg">🪙{trade.price?.toFixed(2) || "N/A"}</div>
                        <div className="text-sm text-gray-600">Qty: {trade.quantity}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.action?.toUpperCase() === "BUY"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {trade.action?.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          normalizeStatus(trade.status) === "ACTIVE"
                            ? "bg-blue-100 text-blue-800"
                            : normalizeStatus(trade.status) === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {normalizeStatus(trade.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserTrades
