/*
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

  // WebSocket URL - change for production
  const SOCKET_URL = "ws://localhost:3000"

  // Load initial watchlist from Supabase or localStorage
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        // Option 1: Load from Supabase (recommended)
        // const response = await fetch('/api/watchlist')
        // const data = await response.json()
        
        // Option 2: Load from localStorage (current approach)
        const saved = localStorage.getItem("zerodha_watchlist")
        const data = saved ? JSON.parse(saved) : []
        
        // Format data consistently
        const formattedData = data.map(item => ({
          instrument_key: item.instrument_key || item.symbol,
          symbol: item.instrument_key?.split(':')[1] || item.symbol || 'Unknown',
          name: item.name || item.instrument_key?.split(':')[1] || 'Unknown',
          exchange: item.exchange || item.instrument_key?.split(':')[0] || 'NSE'
        }))
        
        setWatchlist(formattedData)
      } catch (error) {
        console.error("Error loading watchlist:", error)
      }
    }
    loadWatchlist()
  }, [])

  // WebSocket connection management
  useEffect(() => {
    const userId = localStorage.getItem("id")
    
    if (!userId) {
      console.error("No user ID found");
      return;
    }

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userId },
      query: { 
        clientType: "web",
        version: "1.0"
      }
    });

    // Connection events
    socket.on("connect", () => {
      console.log("WS Connected with ID:", socket.id);
      setConnectionStatus("connected");
    });

    socket.on("connect_error", (err) => {
      console.error("WS Connection error:", err.message);
      setConnectionStatus("error");
    });

    socket.on("disconnect", (reason) => {
      console.log("WS Disconnected:", reason);
      setConnectionStatus("disconnected");
    });

    // Data handler - Fixed to use instrument_key as the key
    socket.on("watchlist_update", (data) => {
      console.log("Received data:", data);
      setRealTimeData(prev => ({
        ...prev,
        ...data.reduce((acc, item) => {
          acc[item.instrument_key] = item; // Use instrument_key as the key
          return acc;
        }, {})
      }));
    });

    socketRef.current = socket;

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  // Update server when watchlist changes
  useEffect(() => {
    if (socketRef.current?.connected && watchlist.length > 0) {
      const instruments = watchlist.map(stock => stock.instrument_key || stock.symbol)
      socketRef.current.emit("watchlist_subscribe", instruments)
    }
  }, [watchlist])

  // Alternative approach: Show all WebSocket data directly without filtering by watchlist
  const displayStocks = Object.values(realTimeData).map(stock => ({
    instrument_key: stock.instrument_key,
    symbol: stock.instrument_key?.split(':')[1] || 'Unknown',
    name: stock.instrument_key?.split(':')[1] || 'Unknown',
    exchange: stock.instrument_key?.split(':')[0] || 'Unknown',
    ltp: stock.last_price ?? 0,
    change: stock.change_percent ?? 0,
    high: stock.ohlc?.high ?? 0,
    low: stock.ohlc?.low ?? 0,
    volume: stock.volume ?? 0
  }))

  // Filter stocks based on search term
  const filteredStocks = displayStocks.filter(stock => {
    const search = searchTerm.toLowerCase()
    return (
      stock.name.toLowerCase().includes(search) ||
      stock.symbol.toLowerCase().includes(search) ||
      stock.instrument_key.toLowerCase().includes(search)
    )
  })

  // If you want to match with watchlist, use this instead:
  /*
  const filteredStocks = watchlist
    .filter(stock => {
      const search = searchTerm.toLowerCase()
      return (
        stock.name.toLowerCase().includes(search) ||
        stock.symbol.toLowerCase().includes(search)
      )
    })
    .map(stock => {
      const realTime = realTimeData[stock.instrument_key] || {}
      return {
        ...stock,
        ltp: realTime.last_price ?? 0,
        change: realTime.change_percent ?? 0,
        high: realTime.ohlc?.high ?? 0,
        low: realTime.ohlc?.low ?? 0,
        volume: realTime.volume ?? 0
      }
    })
    .filter(stock => stock.ltp > 0) // Only show stocks with data
  */

  const handleTrade = (symbol) => {
    console.log("Trade initiated for:", symbol)
    // Implement your trade logic here
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Watchlist</h1>
          <p className="text-gray-500">
            Connection: <span className={
              connectionStatus === "connected" ? "text-green-500" : 
              connectionStatus === "error" ? "text-red-500" : "text-yellow-500"
            }>
              {connectionStatus}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          placeholder="Search stocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      <div className="card">
        <div className="card-content">
          {filteredStocks.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>LTP</th>
                  <th>Change</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Volume</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock, index) => (
                  <tr key={stock.instrument_key || index}>
                    <td>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-gray-500">{stock.exchange}</div>
                    </td>
                    <td>₹{stock.ltp.toFixed(2)}</td>
                    <td className={
                      stock.change >= 0 ? "text-green-500" : "text-red-500"
                    }>
                      {stock.change >= 0 ? "+" : ""}
                      {stock.change.toFixed(2)}%
                    </td>
                    <td>₹{stock.high.toFixed(2)}</td>
                    <td>₹{stock.low.toFixed(2)}</td>
                    <td>{stock.volume.toLocaleString()}</td>
                    <td>
                      <button 
                        onClick={() => handleTrade(stock.instrument_key)}
                        className="btn btn-sm btn-outline"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {connectionStatus === "connected" ? 
                (searchTerm ? "No matching stocks found" : "Waiting for data...") : 
                "Connecting to server..."
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserWatchlist