/*
import { ArrowDown, ArrowUp, LineChart, PieChart } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import { useEffect, useState, useRef } from 'react'
import { io } from "socket.io-client"

function UserPortfolio() {
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const socketRef = useRef(null)

  // // WebSocket URL - change for production
  // const SOCKET_URL = "ws://localhost:3000"

  // WebSocket URL - automatically detects environment
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

console.log('Socket URL:', SOCKET_URL);
console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');

  // Get user ID from localStorage
  const userId = localStorage.getItem("id")

  // WebSocket connection management
  useEffect(() => {
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
      console.log("Portfolio WS Connected with ID:", socket.id);
      setConnectionStatus("connected");
    });

    socket.on("connect_error", (err) => {
      console.error("Portfolio WS Connection error:", err.message);
      setConnectionStatus("error");
      setRealTimeData({});
    });

    socket.on("disconnect", (reason) => {
      console.log("Portfolio WS Disconnected:", reason);
      setConnectionStatus("disconnected");
      setRealTimeData({});
    });

    // Data handler for real-time updates
    socket.on("watchlist_update", (data) => {
      console.log("Portfolio received real-time data:", data);
      setRealTimeData(prev => ({
        ...prev,
        ...data.reduce((acc, item) => {
          acc[item.instrument_key] = item;
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
  }, [userId]);

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'))
        
        if (!currentUser) {
          throw new Error("User not authenticated - please login again")
        }
        
        if (!currentUser.id) {
          throw new Error("User ID not found in currentUser object")
        }

        const response = await fetch(`/api/v2/trades/portfolio/${currentUser.id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          let errorDetails = ''
          try {
            const errorData = await response.json()
            errorDetails = errorData.error || errorData.message || JSON.stringify(errorData)
          } catch (e) {
            errorDetails = await response.text()
          }
          throw new Error(`Server error: ${response.status} - ${errorDetails}`)
        }

        const data = await response.json()
        
        if (data.success) {
          setPortfolioData(data.portfolio)
          console.log("Portfolio data loaded:", data.portfolio)
        } else {
          throw new Error(data.error || 'Unknown error in response')
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
  }, [])

  // Subscribe to portfolio instruments for real-time updates
  useEffect(() => {
    if (socketRef.current?.connected && portfolioData?.positions?.length > 0) {
      const instruments = portfolioData.positions.map(pos => pos.instrument_key)
      console.log("Subscribing to portfolio instruments:", instruments)
      socketRef.current.emit("watchlist_subscribe", instruments)
    }
  }, [portfolioData])

  // FIXED: Helper function to get current price with proper fallback
  const getCurrentPrice = (instrumentKey, fallbackPrice, avgPrice) => {
    // Only use real-time data if WebSocket is connected AND we have valid data
    if (connectionStatus === "connected" && realTimeData[instrumentKey]?.last_price !== undefined) {
      const realTimePrice = realTimeData[instrumentKey].last_price
      if (realTimePrice !== null && realTimePrice > 0) {
        console.log(`Using real-time price for ${instrumentKey}: ${realTimePrice}`)
        return realTimePrice
      }
    }
    
    // FIXED: Properly extract numeric value from fallback price
    let price = 0
    if (typeof fallbackPrice === 'object' && fallbackPrice !== null) {
      // If fallbackPrice is an object, try to extract the price
      price = parseFloat(fallbackPrice.price || fallbackPrice.current_price || fallbackPrice.last_price || 0)
    } else {
      // If it's already a number or string
      price = parseFloat(fallbackPrice) || 0
    }
    
    // If we still don't have a valid price, use average price as fallback
    if (price <= 0) {
      price = parseFloat(avgPrice) || 0
      console.log(`Using average price as fallback for ${instrumentKey}: ${price}`)
    } else {
      console.log(`Using fallback price for ${instrumentKey}: ${price} (original: ${JSON.stringify(fallbackPrice)})`)
    }
    
    return price
  }

  // Helper function to calculate real-time P&L
  const calculateRealTimePnL = (position) => {
    const currentPrice = getCurrentPrice(position.instrument_key, position.current_price, position.average_price)
    const quantity = parseInt(position.quantity) || 0
    const avgPrice = parseFloat(position.average_price) || 0
    
    const investmentValue = avgPrice * quantity
    const currentValue = currentPrice * quantity
    const pnl = currentValue - investmentValue
    const pnlPercent = investmentValue > 0 ? (pnl / investmentValue) * 100 : 0
    
    console.log(`P&L calc for ${position.instrument_key}: qty=${quantity}, avgPrice=${avgPrice}, currentPrice=${currentPrice}, investment=${investmentValue}, currentValue=${currentValue}, pnl=${pnl}`)
    
    return {
      currentPrice,
      currentValue,
      pnl,
      pnlPercent
    }
  }

  // Helper function to safely convert to number and format
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0
    return num.toFixed(2)
  }

  const formatPercentage = (value) => {
    const num = parseFloat(value) || 0
    return Math.abs(num).toFixed(2)
  }

  // FIXED: Calculate summary with real-time data - ONLY for current holdings
  const calculateSummary = () => {
    if (!portfolioData?.positions) return { total_current_value: 0, total_investment: 0, total_pnl: 0, total_pnl_percent: 0 }

    let totalCurrentValue = 0
    let totalInvestment = 0

    // FILTER OUT POSITIONS WITH ZERO QUANTITY (sold positions)
    const currentHoldings = portfolioData.positions.filter(position => {
      const quantity = parseInt(position.quantity) || 0
      return quantity > 0
    })

    console.log(`Total positions: ${portfolioData.positions.length}, Current holdings: ${currentHoldings.length}`)

    currentHoldings.forEach(position => {
      const { currentValue } = calculateRealTimePnL(position)
      const quantity = parseInt(position.quantity) || 0
      const avgPrice = parseFloat(position.average_price) || 0
      const investmentValue = avgPrice * quantity
      
      console.log(`Summary calc for ${position.instrument_key}: qty=${quantity}, avgPrice=${avgPrice}, investment=${investmentValue}, currentValue=${currentValue}`)
      
      totalCurrentValue += currentValue
      totalInvestment += investmentValue
    })

    const totalPnl = totalCurrentValue - totalInvestment
    const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0

    console.log(`Summary totals: currentValue=${totalCurrentValue}, investment=${totalInvestment}, pnl=${totalPnl}, pnlPercent=${totalPnlPercent}`)

    return {
      total_current_value: totalCurrentValue,
      total_investment: totalInvestment,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent
    }
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
      <div className="text-center py-8">
        <div className="text-red-500 font-medium">Error loading portfolio:</div>
        <div className="text-sm mt-2 p-4 bg-red-50 rounded whitespace-pre-wrap">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!portfolioData) {
    return <div className="text-center py-8">No portfolio data available</div>
  }

  const { positions, coin_balance } = portfolioData
  const summary = calculateSummary()

  // Filter current holdings (quantity > 0) for display
  const currentHoldings = positions.filter(position => {
    const quantity = parseInt(position.quantity) || 0
    return quantity > 0
  })

  // Group current holdings by type
  const nseStocks = currentHoldings.filter(pos => pos.instrument_key?.startsWith('NSE'))
  const mcxStocks = currentHoldings.filter(pos => pos.instrument_key?.startsWith('MCX'))

  return (
    <div className="space-y-6">
      {/* Header with Coin Balance and Connection Status }
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-gray-500">
            Track your investments and performance
            <span className="ml-2">
              • WebSocket: <span className={
                connectionStatus === "connected" ? "text-green-500" : 
                connectionStatus === "error" ? "text-red-500" : "text-yellow-500"
              }>
                {connectionStatus}
              </span>
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">🪙{coin_balance ?? 0} coins</div>
          <p className="text-sm text-gray-500">Available balance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Portfolio Value Card }
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Portfolio Value</h3>
            <PieChart className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">
              🪙{formatCurrency(summary.total_current_value)}
            </div>
            <p className="text-xs text-gray-500">Current market value</p>
          </div>
        </div>

        {/* Total Investment Card }
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Investment</h3>
            <LineChart className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">
              🪙{formatCurrency(summary.total_investment)}
            </div>
            <p className="text-xs text-gray-500">Cost basis</p>
          </div>
        </div>

        {/* Total P&L Card }
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total P&L</h3>
            {summary.total_pnl >= 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="card-content">
            <div className={`text-2xl font-bold ${
              summary.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {summary.total_pnl >= 0 ? "+" : ""}
              🪙{formatCurrency(Math.abs(summary.total_pnl))}
            </div>
            <p className="text-xs text-gray-500">
              {connectionStatus === "connected" ? "Real-time P&L" : "Cached P&L"}
            </p>
          </div>
        </div>

        {/* Return Card }
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Return</h3>
            {summary.total_pnl_percent >= 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="card-content">
            <div className={`text-2xl font-bold ${
              summary.total_pnl_percent >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {summary.total_pnl_percent >= 0 ? "+" : ""}
              {formatPercentage(summary.total_pnl_percent)}%
            </div>
            <p className="text-xs text-gray-500">Overall performance</p>
          </div>
        </div>
      </div>

      {/* Portfolio Holdings }
      <div className="space-y-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Portfolio Summary</h3>
            <p className="card-description">
              Overview of your current holdings 
              {connectionStatus === "connected" && (
                <span className="text-green-600 ml-2">• Live prices</span>
              )}
            </p>
          </div>
          <div className="card-content">
            <div className="space-y-8">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Holdings </TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Instrument</th>
                          <th>Quantity</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                          <th>Trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentHoldings.map((position) => {
                          const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
                          const isRealTime = connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined
                          
                          return (
                            <tr key={position.instrument_key}>
                              <td className="font-medium">{position.instrument_key}</td>
                              <td>{position.quantity}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  🪙{formatCurrency(currentPrice)}
                                  {isRealTime && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                                          title="Live price"></span>
                                  )}
                                </div>
                              </td>
                              <td>🪙{formatCurrency(currentValue)}</td>
                              <td className={pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnl >= 0 ? "+" : ""}
                                🪙{formatCurrency(Math.abs(pnl))}
                              </td>
                              <td className={pnlPercent >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnlPercent >= 0 ? "+" : ""}
                                {formatPercentage(pnlPercent)}%
                              </td>
                              <td>{position.trade_count}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="nse">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Instrument</th>
                          <th>Quantity</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nseStocks.map((position) => {
                          const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
                          const isRealTime = connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined
                          
                          return (
                            <tr key={position.instrument_key}>
                              <td className="font-medium">{position.instrument_key}</td>
                              <td>{position.quantity}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  🪙{formatCurrency(currentPrice)}
                                  {isRealTime && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                                          title="Live price"></span>
                                  )}
                                </div>
                              </td>
                              <td>🪙{formatCurrency(currentValue)}</td>
                              <td className={pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnl >= 0 ? "+" : ""}
                                🪙{formatCurrency(Math.abs(pnl))}
                              </td>
                              <td className={pnlPercent >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnlPercent >= 0 ? "+" : ""}
                                {formatPercentage(pnlPercent)}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="mcx">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Instrument</th>
                          <th>Quantity</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mcxStocks.map((position) => {
                          const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
                          const isRealTime = connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined
                          
                          return (
                            <tr key={position.instrument_key}>
                              <td className="font-medium">{position.instrument_key}</td>
                              <td>{position.quantity}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  🪙{formatCurrency(currentPrice)}
                                  {isRealTime && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                                          title="Live price"></span>
                                  )}
                                </div>
                              </td>
                              <td>🪙{formatCurrency(currentValue)}</td>
                              <td className={pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnl >= 0 ? "+" : ""}
                                🪙{formatCurrency(Math.abs(pnl))}
                              </td>
                              <td className={pnlPercent >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {pnlPercent >= 0 ? "+" : ""}
                                {formatPercentage(pnlPercent)}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserPortfolio
*/
/*

import { ArrowDown, ArrowUp, LineChart, PieChart } from "../../components/icons"
import { useEffect, useState, useRef } from 'react'
import { io } from "socket.io-client"

function UserPortfolio() {
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [activeTab, setActiveTab] = useState("all") // Manual tab state
  const socketRef = useRef(null)

  // WebSocket URL - automatically detects environment
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

  console.log('Socket URL:', SOCKET_URL);
  console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');

  // Get user ID from localStorage
  const userId = localStorage.getItem("id")

  // WebSocket connection management
  useEffect(() => {
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
      console.log("Portfolio WS Connected with ID:", socket.id);
      setConnectionStatus("connected");
    });

    socket.on("connect_error", (err) => {
      console.error("Portfolio WS Connection error:", err.message);
      setConnectionStatus("error");
      setRealTimeData({});
    });

    socket.on("disconnect", (reason) => {
      console.log("Portfolio WS Disconnected:", reason);
      setConnectionStatus("disconnected");
      setRealTimeData({});
    });

    // Data handler for real-time updates
    socket.on("watchlist_update", (data) => {
      console.log("Portfolio received real-time data:", data);
      setRealTimeData(prev => ({
        ...prev,
        ...data.reduce((acc, item) => {
          acc[item.instrument_key] = item;
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
  }, [userId]);

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'))
        
        if (!currentUser) {
          throw new Error("User not authenticated - please login again")
        }
        
        if (!currentUser.id) {
          throw new Error("User ID not found in currentUser object")
        }

        const response = await fetch(`/api/v2/trades/portfolio/${currentUser.id}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          let errorDetails = ''
          try {
            const errorData = await response.json()
            errorDetails = errorData.error || errorData.message || JSON.stringify(errorData)
          } catch (e) {
            errorDetails = await response.text()
          }
          throw new Error(`Server error: ${response.status} - ${errorDetails}`)
        }

        const data = await response.json()
        
        if (data.success) {
          setPortfolioData(data.portfolio)
          console.log("Portfolio data loaded:", data.portfolio)
        } else {
          throw new Error(data.error || 'Unknown error in response')
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
  }, [])

  // Subscribe to portfolio instruments for real-time updates
  useEffect(() => {
    if (socketRef.current?.connected && portfolioData?.positions?.length > 0) {
      const instruments = portfolioData.positions.map(pos => pos.instrument_key)
      console.log("Subscribing to portfolio instruments:", instruments)
      socketRef.current.emit("watchlist_subscribe", instruments)
    }
  }, [portfolioData])

  // Helper function to get current price with proper fallback
  const getCurrentPrice = (instrumentKey, fallbackPrice, avgPrice) => {
    // Only use real-time data if WebSocket is connected AND we have valid data
    if (connectionStatus === "connected" && realTimeData[instrumentKey]?.last_price !== undefined) {
      const realTimePrice = realTimeData[instrumentKey].last_price
      if (realTimePrice !== null && realTimePrice > 0) {
        console.log(`Using real-time price for ${instrumentKey}: ${realTimePrice}`)
        return realTimePrice
      }
    }
    
    // Extract numeric value from fallback price
    let price = 0
    if (typeof fallbackPrice === 'object' && fallbackPrice !== null) {
      price = parseFloat(fallbackPrice.price || fallbackPrice.current_price || fallbackPrice.last_price || 0)
    } else {
      price = parseFloat(fallbackPrice) || 0
    }
    
    // If we still don't have a valid price, use average price as fallback
    if (price <= 0) {
      price = parseFloat(avgPrice) || 0
      console.log(`Using average price as fallback for ${instrumentKey}: ${price}`)
    } else {
      console.log(`Using fallback price for ${instrumentKey}: ${price}`)
    }
    
    return price
  }

  // Helper function to calculate real-time P&L
  const calculateRealTimePnL = (position) => {
    const currentPrice = getCurrentPrice(position.instrument_key, position.current_price, position.average_price)
    const quantity = parseInt(position.quantity) || 0
    const avgPrice = parseFloat(position.average_price) || 0
    
    const investmentValue = avgPrice * quantity
    const currentValue = currentPrice * quantity
    const pnl = currentValue - investmentValue
    const pnlPercent = investmentValue > 0 ? (pnl / investmentValue) * 100 : 0
    
    return {
      currentPrice,
      currentValue,
      pnl,
      pnlPercent
    }
  }

  // Helper function to safely convert to number and format
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0
    return num.toFixed(2)
  }

  const formatPercentage = (value) => {
    const num = parseFloat(value) || 0
    return Math.abs(num).toFixed(2)
  }

  // Calculate summary with real-time data - ONLY for current holdings
  const calculateSummary = () => {
    if (!portfolioData?.positions) return { total_current_value: 0, total_investment: 0, total_pnl: 0, total_pnl_percent: 0 }

    let totalCurrentValue = 0
    let totalInvestment = 0

    // Filter out positions with zero quantity (sold positions)
    const currentHoldings = portfolioData.positions.filter(position => {
      const quantity = parseInt(position.quantity) || 0
      return quantity > 0
    })

    currentHoldings.forEach(position => {
      const { currentValue } = calculateRealTimePnL(position)
      const quantity = parseInt(position.quantity) || 0
      const avgPrice = parseFloat(position.average_price) || 0
      const investmentValue = avgPrice * quantity
      
      totalCurrentValue += currentValue
      totalInvestment += investmentValue
    })

    const totalPnl = totalCurrentValue - totalInvestment
    const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0

    return {
      total_current_value: totalCurrentValue,
      total_investment: totalInvestment,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent
    }
  }

  // Render table rows
  const renderTableRows = (positions) => {
    console.log("Rendering table rows for positions:", positions);
    
    if (!positions || positions.length === 0) {
      return (
        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No holdings found
          </td>
        </tr>
      )
    }

    return positions.map((position) => {
      const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
      const isRealTime = connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined
      
      return (
        <tr key={position.instrument_key} style={{ borderBottom: '1px solid #eee' }}>
          <td style={{ padding: '12px', fontWeight: 'bold' }}>{position.instrument_key}</td>
          <td style={{ padding: '12px' }}>{position.quantity}</td>
          <td style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              🪙{formatCurrency(currentPrice)}
              {isRealTime && (
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#10b981', 
                  borderRadius: '50%',
                  display: 'inline-block'
                }} title="Live price"></span>
              )}
            </div>
          </td>
          <td style={{ padding: '12px' }}>🪙{formatCurrency(currentValue)}</td>
          <td style={{ padding: '12px', color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
            {pnl >= 0 ? "+" : ""}
            🪙{formatCurrency(Math.abs(pnl))}
          </td>
          <td style={{ padding: '12px', color: pnlPercent >= 0 ? '#10b981' : '#ef4444' }}>
            {pnlPercent >= 0 ? "+" : ""}
            {formatPercentage(pnlPercent)}%
          </td>
          <td style={{ padding: '12px' }}>{position.trade_count || 0}</td>
        </tr>
      )
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '256px' }}>
        <div style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ color: '#ef4444', fontWeight: 'bold' }}>Error loading portfolio:</div>
        <div style={{ fontSize: '14px', marginTop: '8px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!portfolioData) {
    return <div style={{ textAlign: 'center', padding: '32px' }}>No portfolio data available</div>
  }

  const { positions, coin_balance } = portfolioData
  const summary = calculateSummary()

  // Filter current holdings (quantity > 0) for display
  const currentHoldings = positions.filter(position => {
    const quantity = parseInt(position.quantity) || 0
    return quantity > 0
  })

  // Group current holdings by type
  const nseStocks = currentHoldings.filter(pos => pos.instrument_key?.startsWith('NSE'))
  const mcxStocks = currentHoldings.filter(pos => pos.instrument_key?.startsWith('MCX'))

  console.log("Current Holdings:", currentHoldings);
  console.log("NSE Stocks:", nseStocks);
  console.log("MCX Stocks:", mcxStocks);

  // Get positions to display based on active tab
  const getDisplayPositions = () => {
    switch(activeTab) {
      case 'nse': return nseStocks;
      case 'mcx': return mcxStocks;
      default: return currentHoldings;
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Coin Balance and Connection Status }
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Portfolio</h1>
          <p style={{ color: '#666', margin: 0 }}>
            Track your investments and performance
            <span style={{ marginLeft: '8px' }}>
              • WebSocket: <span style={{ 
                color: connectionStatus === "connected" ? '#10b981' : 
                       connectionStatus === "error" ? '#ef4444' : '#f59e0b'
              }}>
                {connectionStatus}
              </span>
            </span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🪙{coin_balance ?? 0} coins</div>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Available balance</p>
        </div>
      </div>

      {/* Summary Cards }
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Portfolio Value Card }
        <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'medium', margin: 0 }}>Portfolio Value</h3>
            <PieChart style={{ width: '16px', height: '16px', color: '#666' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            🪙{formatCurrency(summary.total_current_value)}
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Current market value</p>
        </div>

        {/* Total Investment Card }
        <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'medium', margin: 0 }}>Total Investment</h3>
            <LineChart style={{ width: '16px', height: '16px', color: '#666' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            🪙{formatCurrency(summary.total_investment)}
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Cost basis</p>
        </div>

        {/* Total P&L Card }
        <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'medium', margin: 0 }}>Total P&L</h3>
            {summary.total_pnl >= 0 ? (
              <ArrowUp style={{ width: '16px', height: '16px', color: '#10b981' }} />
            ) : (
              <ArrowDown style={{ width: '16px', height: '16px', color: '#ef4444' }} />
            )}
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: summary.total_pnl >= 0 ? '#10b981' : '#ef4444'
          }}>
            {summary.total_pnl >= 0 ? "+" : ""}
            🪙{formatCurrency(Math.abs(summary.total_pnl))}
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
            {connectionStatus === "connected" ? "Real-time P&L" : "Cached P&L"}
          </p>
        </div>

        {/* Return Card }
        <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'medium', margin: 0 }}>Return</h3>
            {summary.total_pnl_percent >= 0 ? (
              <ArrowUp style={{ width: '16px', height: '16px', color: '#10b981' }} />
            ) : (
              <ArrowDown style={{ width: '16px', height: '16px', color: '#ef4444' }} />
            )}
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: summary.total_pnl_percent >= 0 ? '#10b981' : '#ef4444'
          }}>
            {summary.total_pnl_percent >= 0 ? "+" : ""}
            {formatPercentage(summary.total_pnl_percent)}%
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Overall performance</p>
        </div>
      </div>

      {/* Portfolio Holdings }
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Portfolio Summary</h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Overview of your current holdings 
            {connectionStatus === "connected" && (
              <span style={{ color: '#10b981', marginLeft: '8px' }}>• Live prices</span>
            )}
          </p>
        </div>
        
        {/* Manual Tab Implementation }
        <div style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '16px' }}>
            <button 
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'all' ? '#3b82f6' : '#666'
              }}
            >
              All Holdings ({currentHoldings.length})
            </button>
            <button 
              onClick={() => setActiveTab('nse')}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'nse' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'nse' ? '#3b82f6' : '#666'
              }}
            >
              NSE ({nseStocks.length})
            </button>
            <button 
              onClick={() => setActiveTab('mcx')}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'mcx' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'mcx' ? '#3b82f6' : '#666'
              }}
            >
              MCX ({mcxStocks.length})
            </button>
          </div>
          
          {/* Table }
          <div   style={{ 
    maxHeight: '400px',  // Set your preferred height here
    overflowY: 'auto', 
    overflowX: 'auto', 
    paddingBottom: '24px' 
  }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Instrument</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Quantity</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Current Price</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>P&L</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Return %</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Trades</th>
                </tr>
              </thead>
              <tbody>
                {renderTableRows(getDisplayPositions())}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserPortfolio

*/
"use client"

import { ArrowDown, ArrowUp, LineChart, PieChart } from "../../components/icons"
import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"

function UserPortfolio() {
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [realTimeData, setRealTimeData] = useState({})
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [activeTab, setActiveTab] = useState("all")
  const socketRef = useRef(null)

  // WebSocket URL - automatically detects environment
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
  console.log("Socket URL:", SOCKET_URL)
  console.log("Environment:", import.meta.env.PROD ? "Production" : "Development")

  // Get user ID from localStorage
  const userId = localStorage.getItem("id")

  // WebSocket connection management
  useEffect(() => {
    if (!userId) {
      console.error("No user ID found")
      return
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
        version: "1.0",
      },
    })

    // Connection events
    socket.on("connect", () => {
      console.log("Portfolio WS Connected with ID:", socket.id)
      setConnectionStatus("connected")
    })

    socket.on("connect_error", (err) => {
      console.error("Portfolio WS Connection error:", err.message)
      setConnectionStatus("error")
      setRealTimeData({})
    })

    socket.on("disconnect", (reason) => {
      console.log("Portfolio WS Disconnected:", reason)
      setConnectionStatus("disconnected")
      setRealTimeData({})
    })

    // Data handler for real-time updates
    socket.on("watchlist_update", (data) => {
      console.log("Portfolio received real-time data:", data)
      setRealTimeData((prev) => ({
        ...prev,
        ...data.reduce((acc, item) => {
          acc[item.instrument_key] = item
          return acc
        }, {}),
      }))
    })

    socketRef.current = socket

    return () => {
      if (socket.connected) {
        socket.disconnect()
      }
    }
  }, [userId])

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"))

        if (!currentUser) {
          throw new Error("User not authenticated - please login again")
        }

        if (!currentUser.id) {
          throw new Error("User ID not found in currentUser object")
        }

        const response = await fetch(`/api/v2/trades/portfolio/${currentUser.id}`, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          let errorDetails = ""
          try {
            const errorData = await response.json()
            errorDetails = errorData.error || errorData.message || JSON.stringify(errorData)
          } catch (e) {
            errorDetails = await response.text()
          }
          throw new Error(`Server error: ${response.status} - ${errorDetails}`)
        }

        const data = await response.json()

        if (data.success) {
          setPortfolioData(data.portfolio)
          console.log("Portfolio data loaded:", data.portfolio)
        } else {
          throw new Error(data.error || "Unknown error in response")
        }
      } catch (err) {
        console.error("Error fetching portfolio:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
  }, [])

  // Subscribe to portfolio instruments for real-time updates
  useEffect(() => {
    if (socketRef.current?.connected && portfolioData?.positions?.length > 0) {
      const instruments = portfolioData.positions.map((pos) => pos.instrument_key)
      console.log("Subscribing to portfolio instruments:", instruments)
      socketRef.current.emit("watchlist_subscribe", instruments)
    }
  }, [portfolioData])

  // Helper function to get current price with proper fallback - ENHANCED LIVE DATA LOGIC
  const getCurrentPrice = (instrumentKey, fallbackPrice, avgPrice) => {
    // PRIORITY 1: Only use real-time data if WebSocket is connected AND we have valid data
    if (connectionStatus === "connected" && realTimeData[instrumentKey]?.last_price !== undefined) {
      const realTimePrice = realTimeData[instrumentKey].last_price
      if (realTimePrice !== null && realTimePrice > 0) {
        console.log(`Using real-time price for ${instrumentKey}: ${realTimePrice}`)
        return realTimePrice
      }
    }

    // PRIORITY 2: Extract numeric value from fallback price (cached/stored price)
    let price = 0
    if (typeof fallbackPrice === "object" && fallbackPrice !== null) {
      // If fallbackPrice is an object, try to extract the price
      price = Number.parseFloat(fallbackPrice.price || fallbackPrice.current_price || fallbackPrice.last_price || 0)
    } else {
      // If it's already a number or string
      price = Number.parseFloat(fallbackPrice) || 0
    }

    // PRIORITY 3: If we still don't have a valid price, use average price as final fallback
    if (price <= 0) {
      price = Number.parseFloat(avgPrice) || 0
      console.log(`Using average price as final fallback for ${instrumentKey}: ${price}`)
    } else {
      console.log(`Using fallback price for ${instrumentKey}: ${price} (original: ${JSON.stringify(fallbackPrice)})`)
    }

    return price
  }

  // Helper function to calculate real-time P&L with enhanced logging
  const calculateRealTimePnL = (position) => {
    const currentPrice = getCurrentPrice(position.instrument_key, position.current_price, position.average_price)
    const quantity = Number.parseInt(position.quantity) || 0
    const avgPrice = Number.parseFloat(position.average_price) || 0

    const investmentValue = avgPrice * quantity
    const currentValue = currentPrice * quantity
    const pnl = currentValue - investmentValue
    const pnlPercent = investmentValue > 0 ? (pnl / investmentValue) * 100 : 0

    console.log(
      `P&L calc for ${position.instrument_key}: qty=${quantity}, avgPrice=${avgPrice}, currentPrice=${currentPrice}, investment=${investmentValue}, currentValue=${currentValue}, pnl=${pnl}`,
    )

    return {
      currentPrice,
      currentValue,
      pnl,
      pnlPercent,
    }
  }

  // Helper function to safely convert to number and format
  const formatCurrency = (value) => {
    const num = Number.parseFloat(value) || 0
    return num.toFixed(2)
  }

  const formatPercentage = (value) => {
    const num = Number.parseFloat(value) || 0
    return Math.abs(num).toFixed(2)
  }

  // Calculate summary with real-time data - ENHANCED for current holdings only
  const calculateSummary = () => {
    if (!portfolioData?.positions)
      return { total_current_value: 0, total_investment: 0, total_pnl: 0, total_pnl_percent: 0 }

    let totalCurrentValue = 0
    let totalInvestment = 0

    // CRITICAL: Filter out positions with zero quantity (sold positions)
    const currentHoldings = portfolioData.positions.filter((position) => {
      const quantity = Number.parseInt(position.quantity) || 0
      return quantity > 0
    })

    console.log(`Total positions: ${portfolioData.positions.length}, Current holdings: ${currentHoldings.length}`)

    currentHoldings.forEach((position) => {
      const { currentValue } = calculateRealTimePnL(position)
      const quantity = Number.parseInt(position.quantity) || 0
      const avgPrice = Number.parseFloat(position.average_price) || 0
      const investmentValue = avgPrice * quantity

      console.log(
        `Summary calc for ${position.instrument_key}: qty=${quantity}, avgPrice=${avgPrice}, investment=${investmentValue}, currentValue=${currentValue}`,
      )

      totalCurrentValue += currentValue
      totalInvestment += investmentValue
    })

    const totalPnl = totalCurrentValue - totalInvestment
    const totalPnlPercent = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0

    console.log(
      `Summary totals: currentValue=${totalCurrentValue}, investment=${totalInvestment}, pnl=${totalPnl}, pnlPercent=${totalPnlPercent}`,
    )

    return {
      total_current_value: totalCurrentValue,
      total_investment: totalInvestment,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
    }
  }

  // Render table rows for desktop/tablet
  const renderTableRows = (positions) => {
    console.log("Rendering table rows for positions:", positions)

    if (!positions || positions.length === 0) {
      return (
        <tr>
          <td colSpan="7" className="text-center py-8 text-gray-500">
            No holdings found
          </td>
        </tr>
      )
    }

    return positions.map((position) => {
      const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
      const isRealTime =
        connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined

      return (
        <tr key={position.instrument_key} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-3 py-3 font-semibold text-sm">{position.instrument_key}</td>
          <td className="px-3 py-3 text-sm">{position.quantity}</td>
          <td className="px-3 py-3 text-sm">
            <div className="flex items-center gap-1">
              🪙{formatCurrency(currentPrice)}
              {isRealTime && (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live price"></span>
              )}
            </div>
          </td>
          <td className="px-3 py-3 text-sm">🪙{formatCurrency(currentValue)}</td>
          <td className={`px-3 py-3 text-sm font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
            {pnl >= 0 ? "+" : ""}🪙{formatCurrency(Math.abs(pnl))}
          </td>
          <td className={`px-3 py-3 text-sm font-medium ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
            {pnlPercent >= 0 ? "+" : ""}
            {formatPercentage(pnlPercent)}%
          </td>
          <td className="px-3 py-3 text-sm">{position.trade_count || 0}</td>
        </tr>
      )
    })
  }

  // Render mobile cards
  const renderMobileCards = (positions) => {
    if (!positions || positions.length === 0) {
      return <div className="text-center py-8 text-gray-500">No holdings found</div>
    }

    return positions.map((position) => {
      const { currentPrice, currentValue, pnl, pnlPercent } = calculateRealTimePnL(position)
      const isRealTime =
        connectionStatus === "connected" && realTimeData[position.instrument_key]?.last_price !== undefined

      return (
        <div key={position.instrument_key} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-sm text-gray-900">{position.instrument_key}</h4>
              <p className="text-xs text-gray-500">
                Qty: {position.quantity} • Trades: {position.trade_count || 0}
              </p>
            </div>
            {isRealTime && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live price"></span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Current Price</p>
              <p className="font-medium">🪙{formatCurrency(currentPrice)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Value</p>
              <p className="font-medium">🪙{formatCurrency(currentValue)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">P&L</p>
              <p className={`font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {pnl >= 0 ? "+" : ""}🪙{formatCurrency(Math.abs(pnl))}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Return</p>
              <p className={`font-medium ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {pnlPercent >= 0 ? "+" : ""}
                {formatPercentage(pnlPercent)}%
              </p>
            </div>
          </div>
        </div>
      )
    })
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
      <div className="text-center p-8">
        <div className="text-red-600 font-bold mb-2">Error loading portfolio:</div>
        <div className="text-sm bg-red-50 p-4 rounded-lg mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!portfolioData) {
    return <div className="text-center p-8">No portfolio data available</div>
  }

  const { positions, coin_balance } = portfolioData
  const summary = calculateSummary()

  // Filter current holdings (quantity > 0) for display
  const currentHoldings = positions.filter((position) => {
    const quantity = Number.parseInt(position.quantity) || 0
    return quantity > 0
  })

  // Group current holdings by type
  const nseStocks = currentHoldings.filter((pos) => pos.instrument_key?.startsWith("NSE"))
  const mcxStocks = currentHoldings.filter((pos) => pos.instrument_key?.startsWith("MCX"))

  console.log("Current Holdings:", currentHoldings)
  console.log("NSE Stocks:", nseStocks)
  console.log("MCX Stocks:", mcxStocks)

  // Get positions to display based on active tab
  const getDisplayPositions = () => {
    switch (activeTab) {
      case "nse":
        return nseStocks
      case "mcx":
        return mcxStocks
      default:
        return currentHoldings
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header with Coin Balance and Connection Status */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Portfolio</h1>
          <div className="text-gray-600 text-xs sm:text-sm lg:text-base">
            <p className="mb-1 sm:mb-0">Track your investments and performance</p>
            <p className="flex items-center gap-2">
              <span>WebSocket:</span>
              <span
                className={
                  connectionStatus === "connected"
                    ? "text-green-600"
                    : connectionStatus === "error"
                      ? "text-red-600"
                      : "text-yellow-600"
                }
              >
                {connectionStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold">🪙{coin_balance ?? 0} coins</div>
          <p className="text-xs sm:text-sm text-gray-600">Available balance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Portfolio Value Card */}
        <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Portfolio Value</h3>
            <PieChart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
            🪙{formatCurrency(summary.total_current_value)}
          </div>
          <p className="text-xs text-gray-500">Current market value</p>
        </div>

        {/* Total Investment Card */}
        <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Investment</h3>
            <LineChart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
            🪙{formatCurrency(summary.total_investment)}
          </div>
          <p className="text-xs text-gray-500">Cost basis</p>
        </div>

        {/* Total P&L Card */}
        <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total P&L</h3>
            {summary.total_pnl >= 0 ? (
              <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            ) : (
              <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl lg:text-2xl font-bold mb-1 ${
              summary.total_pnl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {summary.total_pnl >= 0 ? "+" : ""}🪙{formatCurrency(Math.abs(summary.total_pnl))}
          </div>
          <p className="text-xs text-gray-500">{connectionStatus === "connected" ? "Real-time P&L" : "Cached P&L"}</p>
        </div>

        {/* Return Card */}
        <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600">Return</h3>
            {summary.total_pnl_percent >= 0 ? (
              <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            ) : (
              <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl lg:text-2xl font-bold mb-1 ${
              summary.total_pnl_percent >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {summary.total_pnl_percent >= 0 ? "+" : ""}
            {formatPercentage(summary.total_pnl_percent)}%
          </div>
          <p className="text-xs text-gray-500">Overall performance</p>
        </div>
      </div>

      {/* Portfolio Holdings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-3 sm:p-4 lg:p-6 border-b">
          <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Portfolio Summary</h3>
          <div className="text-xs sm:text-sm text-gray-600">
            <p className="mb-1 sm:mb-0">Overview of your current holdings</p>
            {connectionStatus === "connected" && <span className="text-green-600">• Live prices</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              All Holdings ({currentHoldings.length})
            </button>
            <button
              onClick={() => setActiveTab("nse")}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "nse"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              NSE ({nseStocks.length})
            </button>
            <button
              onClick={() => setActiveTab("mcx")}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "mcx"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              MCX ({mcxStocks.length})
            </button>
          </div>
        </div>

        {/* Desktop/Tablet Table View */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto max-h-96 lg:max-h-[500px] overflow-y-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instrument
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return %
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trades
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">{renderTableRows(getDisplayPositions())}</tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden p-3">{renderMobileCards(getDisplayPositions())}</div>
      </div>
    </div>
  )
}

export default UserPortfolio
