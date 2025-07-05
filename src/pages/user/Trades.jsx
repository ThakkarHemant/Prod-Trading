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
      {/* Header and Stats */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
        <p className="text-gray-500">Manage your trading positions</p>
      </div>
 
      {/* Search and Filter */}
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

        {/* All Trades Table */}
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