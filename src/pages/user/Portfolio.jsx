
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
const SOCKET_URL = import.meta.env.PROD 
  ? "https://prod-trading.onrender.com"  // Your actual backend URL
  : "http://localhost:3000";

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
      {/* Header with Coin Balance and Connection Status */}
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
        {/* Portfolio Value Card */}
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

        {/* Total Investment Card */}
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

        {/* Total P&L Card */}
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

        {/* Return Card */}
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

      {/* Portfolio Holdings */}
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