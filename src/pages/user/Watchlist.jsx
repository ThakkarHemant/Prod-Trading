/*
"use client"

import { useState, useEffect } from "react"
import { Search } from "../../components/icons"

function UserWatchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("zerodha_watchlist")
    const data = saved ? JSON.parse(saved) : []
    setWatchlist(data)
  }, [])

  const filteredStocks = watchlist.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBuySell = (stock) => {
    console.log(`Buy/Sell ${stock.symbol}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Current Watchlist</h1>
          <p className="text-gray-500">Admin-curated stocks with full details</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search stocks by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input max-w-sm"
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Watchlist</h3>
          </div>
          <div className="card-content">
            {filteredStocks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No matching stocks found</div>
            ) : (
              <div className="table-container overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>LTP</th>
                      <th>Change</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Volume</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock, idx) => (
                      <tr key={idx}>
                        <td>{stock.symbol}</td>
                        <td>{stock.name}</td>
                        <td>{stock.type}</td>
                        <td>₹{stock.ltp?.toFixed(2)}</td>
                        <td className={stock.change >= 0 ? "text-emerald-500" : "text-red-500"}>
                          {stock.change >= 0 ? "+" : ""}
                          {stock.change.toFixed(2)}%
                        </td>
                        <td>₹{stock.high?.toFixed(2)}</td>
                        <td>₹{stock.low?.toFixed(2)}</td>
                        <td>{stock.volume?.toLocaleString()}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm text-xs"
                            onClick={() => handleBuySell(stock)}
                          >
                            Trade
                          </button>
                        </td>
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

export default UserWatchlist
*/
"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "../../components/icons"
import { io } from "socket.io-client"

function UserWatchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [realTimeData, setRealTimeData] = useState({})
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const socketRef = useRef(null)
  const watchlistRef = useRef([])

  // Use a direct URL instead of process.env
  const SOCKET_URL = "http://localhost:3000" 

useEffect(() => {
  const loadWatchlist = () => {
    try {
      const saved = localStorage.getItem("zerodha_watchlist")
      const data = saved ? JSON.parse(saved) : []
      const validatedData = Array.isArray(data) ? data.map(item => {
        if (typeof item === 'string') {
          const [exchange, symbol] = item.split(':')
          return {
            symbol: item, 
            name: symbol,
            exchange: exchange
          }
        }
        return item
      }) : []
      setWatchlist(validatedData)
      watchlistRef.current = validatedData
    } catch (error) {
      console.error("Error loading watchlist:", error)
      setWatchlist([])
      watchlistRef.current = []
    }
  }
  loadWatchlist()
}, [])

  // Socket.IO connection management
  useEffect(() => {
    const userId = localStorage.getItem("id")

    if (!userId) {
      console.error("No user ID found in localStorage")
      setConnectionStatus("unauthorized")
      return
    }
    if (socketRef.current) return

    console.log("Attempting to connect to WebSocket...")
    
    // Get user ID from localStorage
    if (!userId) {
      console.error("No user ID found in localStorage")
      setConnectionStatus("error")
      return
    }

    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        userId: userId 
      }
    })

    const onConnect = () => {
      console.log("Socket.IO connected successfully")
      setConnectionStatus("connected")
      // Send initial watchlist after connection
      if (watchlistRef.current.length > 0) {
        const instruments = watchlistRef.current.map(stock => stock.symbol).filter(Boolean)
        console.log("Subscribing to instruments:", instruments)
        socketInstance.emit("subscribe_instruments", instruments)
      }
    }

    const onDisconnect = (reason) => {
      console.log("Socket.IO disconnected:", reason)
      setConnectionStatus("disconnected")
    }

    const onConnectError = (error) => {
      console.error("Socket.IO connection error:", error)
      setConnectionStatus("error")
    }

    const onMarketUpdate = (data) => {
      console.log("Received market update:", data)
      setRealTimeData(prev => {
        const newData = {...prev}
        if (Array.isArray(data)) {
          data.forEach(update => {
            if (update.instrument_key) {
              newData[update.instrument_key] = update
            }
          })
        } else if (data.instrument_key) {
          newData[data.instrument_key] = data
        }
        return newData
      })
    }

    // Add all event listeners
    socketInstance.on("connect", onConnect)
    socketInstance.on("disconnect", onDisconnect)
    socketInstance.on("connect_error", onConnectError)
    socketInstance.on("market_update", onMarketUpdate)
    socketInstance.on("initial_market_data", onMarketUpdate)

    // Add ping/pong listeners for debugging
    socketInstance.on("ping", () => console.log("Received ping from server"))
    socketInstance.on("pong", () => console.log("Received pong from server"))

    socketRef.current = socketInstance

    return () => {
      console.log("Cleaning up WebSocket connection")
      if (socketRef.current) {
        // Remove all listeners
        socketRef.current.off("connect", onConnect)
        socketRef.current.off("disconnect", onDisconnect)
        socketRef.current.off("connect_error", onConnectError)
        socketRef.current.off("market_update", onMarketUpdate)
        socketRef.current.off("initial_market_data", onMarketUpdate)
        socketRef.current.off("ping")
        socketRef.current.off("pong")
        
        // Disconnect
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // Update server when watchlist changes
  useEffect(() => {
    if (socketRef.current?.connected && watchlist.length > 0) {
      const instruments = watchlist.map(stock => stock.symbol).filter(Boolean)
      console.log("Updating subscription for instruments:", instruments)
      socketRef.current.emit("subscribe_instruments", instruments)
      watchlistRef.current = watchlist
    }
  }, [watchlist])

  const filteredStocks = watchlist.filter((stock) => {
    if (!stock) return false
    const name = stock.name || ""
    const symbol = stock.symbol || ""
    const search = searchTerm.toLowerCase()
    return (
      name.toLowerCase().includes(search) ||
      symbol.toLowerCase().includes(search)
    )
  })

  const stocksWithRealTimeData = filteredStocks.map(stock => {
    if (!stock) return null
    const realTime = realTimeData[stock.symbol] || {}
    return {
      ...stock,
      ltp: realTime.last_price ?? stock.ltp,
      change: realTime.change_percent ?? stock.change,
      high: realTime.ohlc?.high ?? stock.high,
      low: realTime.ohlc?.low ?? stock.low,
      volume: realTime.volume ?? stock.volume
    }
  }).filter(Boolean)

  const handleBuySell = (stock) => {
    console.log(`Buy/Sell ${stock.symbol}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Current Watchlist</h1>
          <p className="text-gray-500">Admin-curated stocks with full details</p>
          <p className="text-sm">
            Connection status: 
            <span className={`ml-2 ${
              connectionStatus === "connected" ? "text-emerald-500" : 
              connectionStatus === "error" ? "text-red-500" : "text-yellow-500"
            }`}>
              {connectionStatus}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search stocks by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input max-w-sm"
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Watchlist</h3>
          </div>
      
          <div className="card-content">
            {filteredStocks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No matching stocks found</div>
            ) : 
              <div className="table-container overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>LTP</th>
                      <th>Change</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Volume</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocksWithRealTimeData.map((stock, idx) => (
                      <tr key={idx}>
                        <td>{stock.name}</td>
                        <td>₹{stock.ltp?.toFixed(2) || 'N/A'}</td>
                        <td className={stock.change >= 0 ? "text-emerald-500" : "text-red-500"}>
                          {stock.change >= 0 ? "+" : ""}
                          {stock.change?.toFixed(2) || '0.00'}%
                        </td>
                        <td>₹{stock.high?.toFixed(2) || 'N/A'}</td>
                        <td>₹{stock.low?.toFixed(2) || 'N/A'}</td>
                        <td>{stock.volume?.toLocaleString() || '0'}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm text-xs"
                            onClick={() => handleBuySell(stock)}
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
} 

export default UserWatchlist