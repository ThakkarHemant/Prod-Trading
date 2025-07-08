
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
