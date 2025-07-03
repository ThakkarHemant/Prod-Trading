/*
"use client"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"

function UserTrades() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        console.log("Fetching trades...")
        const response = await fetch("/api/trades/history")
        console.log("Response status:", response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch trades`)
        }
        
        const data = await response.json()
        console.log("Raw API response:", data)
        
        if (data.success) {
          // Debug: Log the trades array
          console.log("Trades from API:", data.trades)
          console.log("Number of trades:", data.trades?.length || 0)
          
          // Calculate P&L for each trade if not provided by backend
          const tradesWithPnL = (data.trades || []).map(trade => {
            console.log("Processing trade:", trade)
            
            let pnl = trade.pnl
            if (trade.status === "CLOSED" && trade.exit_price) {
              pnl = trade.action === "BUY" 
                ? (trade.exit_price - trade.price) * trade.quantity
                : (trade.price - trade.exit_price) * trade.quantity
            }
            
            const processedTrade = { ...trade, pnl }
            console.log("Processed trade:", processedTrade)
            return processedTrade
          })
          
          console.log("Final trades with P&L:", tradesWithPnL)
          setTrades(tradesWithPnL)
          
          // Set debug info
          setDebugInfo({
            totalTrades: tradesWithPnL.length,
            tradeStatuses: tradesWithPnL.map(t => t.status),
            sampleTrade: tradesWithPnL[0] || null
          })
        } else {
          console.error("API returned success: false", data)
          throw new Error(data.error || "Failed to fetch trades")
        }
      } catch (err) {
        console.error("Error fetching trades:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [])

  const pendingTrades = trades.filter(trade => trade.status === "PENDING")
  const activeTrades = trades.filter(trade => trade.status === "ACTIVE")
  const closedTrades = trades.filter(trade => trade.status === "CLOSED")

  console.log("Filtered trades:", {
    pending: pendingTrades.length,
    active: activeTrades.length,
    closed: closedTrades.length
  })

  const filteredTrades = (status) => {
    const statusFiltered = trades.filter(trade => {
      console.log(`Checking trade status: ${trade.status} === ${status}?`, trade.status === status)
      return trade.status === status
    })
    
    const finalFiltered = statusFiltered.filter(trade => {
      // Check if instruments object exists
      if (!trade.instruments) {
        console.warn("Trade missing instruments object:", trade)
        return false
      }
      
      const matchesSearch = trade.instruments.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           trade.instruments.tradingsymbol?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()
      
      console.log("Filter check:", {
        trade: trade.trade_id,
        matchesSearch,
        matchesType,
        searchTerm,
        typeFilter
      })
      
      return matchesSearch && matchesType
    })
    
    console.log(`Filtered trades for ${status}:`, finalFiltered)
    return finalFiltered
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-500 p-4">
          <h3 className="font-bold mb-2">Error loading trades</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trades Debug</h1>
        <p className="text-gray-500">Debugging trade display issues</p>
      </div>

      {/* Debug Information }
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold mb-2">Debug Information</h3>
        <div className="text-sm space-y-1">
          <p><strong>Total trades loaded:</strong> {trades.length}</p>
          <p><strong>Active trades:</strong> {activeTrades.length}</p>
          <p><strong>Pending trades:</strong> {pendingTrades.length}</p>
          <p><strong>Closed trades:</strong> {closedTrades.length}</p>
          {debugInfo && (
            <>
              <p><strong>Trade statuses:</strong> {debugInfo.tradeStatuses.join(", ")}</p>
              {debugInfo.sampleTrade && (
                <div className="mt-2">
                  <p><strong>Sample trade structure:</strong></p>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.sampleTrade, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Cards }
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Positions</h3>
          <div className="text-2xl font-bold">{activeTrades.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <div className="text-2xl font-bold">{pendingTrades.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Closed Trades</h3>
          <div className="text-2xl font-bold">{closedTrades.length}</div>
        </div>
      </div>

      {/* Search and Filter }
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search by stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2 w-full sm:w-[250px]"
          />
        </div>
        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {/* Simplified Tabs }
      <div className="space-y-4">
        {/* Active Trades }
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Active Trades</h3>
            <p className="text-gray-500">Found {filteredTrades("ACTIVE").length} active trades</p>
          </div>
          <div className="p-6">
            {filteredTrades("ACTIVE").length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No active trades found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Stock</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Entry Price</th>
                      <th className="text-left p-2">P&L</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades("ACTIVE").map(trade => (
                      <tr key={trade.trade_id} className="border-b">
                        <td className="p-2 font-medium">
                          {trade.instruments?.name || 'N/A'} ({trade.instruments?.tradingsymbol || 'N/A'})
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.action === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="p-2">{trade.quantity}</td>
                        <td className="p-2">${trade.price?.toFixed(2) || 'N/A'}</td>
                        <td className={`p-2 ${trade.pnl && trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {trade.pnl ? `${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}` : "-"}
                        </td>
                        <td className="p-2">{formatDate(trade.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* All Trades (for debugging) }
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">All Trades (Debug)</h3>
            <p className="text-gray-500">Showing all {trades.length} trades regardless of filters</p>
          </div>
          <div className="p-6">
            {trades.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No trades loaded from API
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Stock</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => (
                      <tr key={trade.trade_id} className="border-b">
                        <td className="p-2">{trade.trade_id}</td>
                        <td className="p-2">
                          {trade.instruments?.name || 'N/A'} ({trade.instruments?.tradingsymbol || 'N/A'})
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {trade.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.action === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="p-2">{trade.quantity}</td>
                        <td className="p-2">${trade.price?.toFixed(2) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"

function UserTrades() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Map your actual status values to expected ones
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
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const response = await fetch("/api/trades/history", {
        headers: {
          'X-User-ID': currentUser.id, // Pass user ID in header
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch trades");
      }

      const data = await response.json();
      if (data.success) {
        // Calculate P&L for each trade if not provided by backend
        const tradesWithPnL = (data.trades || []).map(trade => {
          let pnl = trade.pnl;
          if (normalizeStatus(trade.status) === "CLOSED" && trade.exit_price) {
            pnl = trade.action === "BUY" 
              ? (trade.exit_price - trade.price) * trade.quantity
              : (trade.price - trade.exit_price) * trade.quantity;
          }
          return { ...trade, pnl };
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

  const filteredTrades = (status) => {
    return trades
      .filter(trade => normalizeStatus(trade.status) === status)
      .filter(trade => {
        // Check if instruments object exists
        if (!trade.instruments) {
          return false
        }
        
        const matchesSearch = trade.instruments.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             trade.instruments.tradingsymbol?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()
        return matchesSearch && matchesType
      })
  }

  const totalProfit = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) > 0 ? (trade.pnl || 0) : 0), 0)
  const totalLoss = trades.reduce((sum, trade) => sum + ((trade.pnl || 0) < 0 ? Math.abs(trade.pnl || 0) : 0), 0)
  const netPnL = totalProfit - totalLoss

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
      {/* Header and Stats */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
        <p className="text-gray-500">Manage your trading positions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Positions Card */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Active Positions</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{activeTrades.length}</div>
            <p className="text-xs text-gray-500">Open trades</p>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Pending Orders</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{pendingTrades.length}</div>
            <p className="text-xs text-gray-500">Awaiting execution</p>
          </div>
        </div>

        {/* Total Profit Card */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Profit</h3>
            <ArrowUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold text-emerald-600">
              ${totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Realized gains</p>
          </div>
        </div>

        {/* Net P&L Card */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Net P&L</h3>
            {netPnL >= 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="card-content">
            <div className={`text-2xl font-bold ${netPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Total P&L</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search by stock..."
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

        {/* All Trades Table with Scroll*/ }
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Trades</h3>
            <p className="card-description">Your complete trading history</p>
          </div>
          <div className="card-content">
            {/* Horizontal Scroll Container */}
            <div className="overflow-x-auto">
              {/* Set minimum width to ensure horizontal scroll when needed */}
              <div className="min-w-[1000px]">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="min-w-[200px]">Stock</th>
                      <th className="min-w-[80px]">Type</th>
                      <th className="min-w-[90px]">Status</th>
                      <th className="min-w-[90px]">Quantity</th>
                      <th className="min-w-[100px]">Entry Price</th>
                      <th className="min-w-[100px]">Exit Price</th>
                      <th className="min-w-[80px]">P&L</th>
                      <th className="min-w-[150px]">Entry Date</th>
                      <th className="min-w-[150px]">Exit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades
                      .filter(trade => {
                        // Apply search and type filters
                        if (!trade.instruments) return false
                        
                        const matchesSearch = trade.instruments.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                             trade.instruments.tradingsymbol?.toLowerCase().includes(searchTerm.toLowerCase())
                        const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()
                        return matchesSearch && matchesType
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          No trades found
                        </td>
                      </tr>
                    ) : (
                      trades
                        .filter(trade => {
                          // Apply search and type filters
                          if (!trade.instruments) return false
                          
                          const matchesSearch = trade.instruments.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                               trade.instruments.tradingsymbol?.toLowerCase().includes(searchTerm.toLowerCase())
                          const matchesType = typeFilter === "all" || trade.action?.toLowerCase() === typeFilter.toLowerCase()
                          return matchesSearch && matchesType
                        })
                        .map(trade => (
                          <tr key={trade.trade_id}>
                            <td className="font-medium">
                              <div className="max-w-[180px] truncate">
                                {trade.instruments?.name || 'N/A'} ({trade.instruments?.tradingsymbol || 'N/A'})
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
                            <td>${trade.exit_price?.toFixed(2) || "-"}</td>
                            <td className={trade.pnl && trade.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {trade.pnl ? `${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}` : "-"}
                            </td>
                            <td className="text-sm">{formatDate(trade.timestamp)}</td>
                            <td className="text-sm">{trade.exit_timestamp ? formatDate(trade.exit_timestamp) : "-"}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="mt-2 text-xs text-gray-500 text-center">
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserTrades
