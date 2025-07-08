"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "../../components/icons"
import { io } from "socket.io-client"
import { supabase } from "../../../utils/supabase"
// Trade Modal Component
const TradeModal = ({ isOpen, onClose, stock, userId, onTradeComplete }) => {
  const [tradeData, setTradeData] = useState({
    action: 'buy',
    quantity: 1,
    loading: false
  });
  const [userBalance, setUserBalance] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Fetch user balance when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserBalance();
    }
  }, [isOpen, userId]);

  // Calculate estimated cost when quantity or stock price changes
  useEffect(() => {
    if (stock?.ltp && tradeData.quantity) {
      setEstimatedCost(stock.ltp * tradeData.quantity);
    }
  }, [stock?.ltp, tradeData.quantity]);

const fetchUserBalance = async () => {
  try {
    // Supabase query to fetch user's coin balance
    const { data, error } = await supabase
      .from('users')
      .select('coins')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      setUserBalance(data.coins);
    }
  } catch (error) {
    console.error('Failed to fetch user balance:', error);
  }
};

  const handleInputChange = (field, value) => {
    setTradeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTradeSubmit = async () => {
    if (!stock || !userId) return;

    setTradeData(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/trades/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          instrument_key: stock.instrument_key,
          action: tradeData.action,
          quantity: parseInt(tradeData.quantity)
        })
      });

      const result = await response.json();

      if (result.success) {
        // Success notification
        alert(`${tradeData.action.toUpperCase()} order executed successfully!\nQuantity: ${tradeData.quantity}\nPrice: 🪙${result.trade.price}\nTotal: 🪙${result.trade.total_cost}`);
        
        // Update user balance
        setUserBalance(result.coinBalance.current);
        
        // Notify parent component
        if (onTradeComplete) {
          onTradeComplete(result);
        }
        
        // Reset form and close modal
        setTradeData({ action: 'buy', quantity: 1, loading: false });
        onClose();
      } else {
        alert(`Trade failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      alert('Trade execution failed. Please try again.');
    } finally {
      setTradeData(prev => ({ ...prev, loading: false }));
    }
  };

  const canAffordTrade = () => {
    if (tradeData.action === 'sell') return true;
    return userBalance !== null && userBalance >= estimatedCost;
  };

  const getSubmitButtonText = () => {
    if (tradeData.loading) return 'Processing...';
    if (tradeData.action === 'buy' && !canAffordTrade()) return 'Insufficient Balance';
    return `${tradeData.action.toUpperCase()} ${tradeData.quantity} shares`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">
          Trade {stock?.symbol || 'Stock'}
        </h3>
        
        {/* Stock Info */}
        <div className="bg-base-200 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">{stock?.symbol}</span>
            <span className="text-lg font-bold">🪙{stock?.ltp?.toFixed(2)}</span>
          </div>
          <div className="text-sm text-gray-600">
            {stock?.name}
          </div>
          {stock?.change && (
            <div className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
            </div>
          )}
        </div>

        {/* User Balance */}
        {userBalance !== null && (
          <div className="bg-info bg-opacity-20 p-3 rounded-lg mb-4">
            <div className="text-sm">Available Balance</div>
            <div className="font-bold text-lg">🪙{userBalance.toFixed(2)}</div>
          </div>
        )}

        {/* Trade Form */}
        <div className="space-y-4">
          {/* Action Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Action</span>
            </label>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm flex-1 ${tradeData.action === 'buy' ? 'btn-success' : 'btn-outline'}`}
                onClick={() => handleInputChange('action', 'buy')}
              >
                BUY
              </button>
              <button
                className={`btn btn-sm flex-1 ${tradeData.action === 'sell' ? 'btn-error' : 'btn-outline'}`}
                onClick={() => handleInputChange('action', 'sell')}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Quantity</span>
            </label>
            <input
              type="number"
              min="1"
              value={tradeData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              className="input input-bordered"
              placeholder="Enter quantity"
            />
          </div>

          {/* Estimated Cost */}
          <div className="bg-base-200 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Estimated {tradeData.action === 'buy' ? 'Cost' : 'Receipt'}:</span>
              <span className="font-bold text-lg">🪙{estimatedCost.toFixed(2)}</span>
            </div>
            {tradeData.action === 'buy' && stock?.ltp && (
              <div className="text-sm text-gray-600 mt-1">
                {tradeData.quantity} × 🪙{stock.ltp.toFixed(2)}
              </div>
            )}
          </div>

          {/* Warning for insufficient balance */}
          {tradeData.action === 'buy' && !canAffordTrade() && (
            <div className="alert alert-warning">
              <div className="text-sm">
                Insufficient balance. Need 🪙{(estimatedCost - (userBalance || 0)).toFixed(2)} more.
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button 
            className="btn btn-ghost flex-1" 
            onClick={onClose}
            disabled={tradeData.loading}
          >
            Cancel
          </button>
          <button
            className={`btn flex-1 ${tradeData.action === 'buy' ? 'btn-success' : 'btn-error'}`}
            onClick={handleTradeSubmit}
            disabled={tradeData.loading || (tradeData.action === 'buy' && !canAffordTrade()) || tradeData.quantity < 1}
          >
            {getSubmitButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

function UserWatchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [realTimeData, setRealTimeData] = useState({})
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [selectedStock, setSelectedStock] = useState(null)
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)
  const [userBalance, setUserBalance] = useState(null)
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

  // Fetch user balance on component mount
  useEffect(() => {
    if (userId) {
      fetchUserBalance();
    }
  }, [userId]);

  const fetchUserBalance = async () => {
    try {
      const response = await fetch(`/api/v2/users/${userId}/balance`);
      const data = await response.json();
      
      if (data.success) {
        setUserBalance(data.coin_balance);
      }
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
    }
  };

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

    // Listen for trade execution updates
    socket.on("trade_executed", (tradeResult) => {
      console.log("Trade executed:", tradeResult);
      // Update balance
      setUserBalance(tradeResult.coinBalance.current);
      // You can add a toast notification here
    });

    socketRef.current = socket;

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [userId]);

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

  const handleTrade = (instrumentKey) => {
    const stock = displayStocks.find(item => item.instrument_key === instrumentKey);
    
    if (stock) {
      setSelectedStock(stock);
      setIsTradeModalOpen(true);
    } else {
      alert('Stock data not found');
    }
  }

  const handleTradeComplete = (tradeResult) => {
    // Update user balance
    setUserBalance(tradeResult.coinBalance.current);
    
    // Log trade completion
    console.log('Trade completed:', tradeResult);
    
    // Optional: You can add a toast notification here
    // toast.success(`Trade executed successfully!`);
  };

  const closeTradeModal = () => {
    setIsTradeModalOpen(false);
    setSelectedStock(null);
  };

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
        
        {/* User Balance Display */}
        {userBalance !== null && (
          <div className="bg-info bg-opacity-20 p-3 rounded-lg">
            <div className="text-sm opacity-80">Available Balance</div>
            <div className="font-bold text-lg">🪙{userBalance.toFixed(2)}</div>
          </div>
        )}
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
                    <td>🪙{stock.ltp.toFixed(2)}</td>
                    <td className={
                      stock.change >= 0 ? "text-green-500" : "text-red-500"
                    }>
                      {stock.change >= 0 ? "+" : ""}
                      {stock.change.toFixed(2)}%
                    </td>
                    <td>🪙{stock.high.toFixed(2)}</td>
                    <td>🪙{stock.low.toFixed(2)}</td>
                    <td>{stock.volume.toLocaleString()}</td>
                    <td>
                      <button 
                        onClick={() => handleTrade(stock.instrument_key)}
                        className="btn btn-sm btn-outline"
                        disabled={!userId}
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

      {/* Trade Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={closeTradeModal}
        stock={selectedStock}
        userId={userId}
        onTradeComplete={handleTradeComplete}
      />
    </div>
  )
}

export default UserWatchlist