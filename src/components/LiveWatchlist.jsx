"use client"

import { use } from "react";
import { useState, useEffect, useRef, useCallback } from "react"

const API_BASE_URL = '/api';

const LiveWatchlist = () => {
  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  
  // State variables
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessToken, setAccessToken] = useState("")
  const [marketData, setMarketData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshCountdown, setRefreshCountdown] = useState(5)
  const [priceChanges, setPriceChanges] = useState({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingOHLC, setIsUpdatingOHLC] = useState(false)
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false)
  const [instrumentsCache, setInstrumentsCache] = useState([]);
  const [lastCacheUpdate, setLastCacheUpdate] = useState(null);
  
  // Search functionality states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Refs
  const popupRef = useRef(null);
  const instrumentsCacheRef = useRef([]);
  const ltpIntervalRef = useRef(null)
  const ohlcIntervalRef = useRef(null)
  const quoteIntervalRef = useRef(null)
  const countdownRef = useRef(null)
  const previousDataRef = useRef({})
  const searchInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const searchDropdownRef = useRef(null)
  
  const API_KEY = import.meta.env.ZERODHA_API_KEY || "2uvuc0xnk4tn8nrg"

  useEffect(() => {
    localStorage.removeItem("zerodha_access_token");
    localStorage.removeItem("zerodha_user");
  },[]);
  // Default watchlist - minimal default list
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem("zerodha_watchlist")
    return saved ? JSON.parse(saved) : ["NSE:HDFCBANK", "NSE:INFY", "NSE:TCS"]
  })

  // Market data fetch functions
  const fetchLTPData = useCallback(async () => {
    const token = accessToken || localStorage.getItem("zerodha_access_token")
    if (!token || watchlist.length === 0) return

    setIsUpdating(true)
    
    try {
      console.log('Frontend: Making LTP requests for', watchlist.length, 'instruments')
      
      const ltpPromises = watchlist.map(async (instrument) => {
        try {
          const response = await fetch(`${API_BASE_URL}/ltp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Kite-Version": "3",
              Authorization: `token ${API_KEY}:${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              instruments: [instrument], // Single instrument in array
            }),
          })

          if (response.ok) {
            const data = await response.json()
            return { instrument, data }
          }
          return { instrument, data: null }
        } catch (err) {
          console.error(`LTP fetch error for ${instrument}:`, err)
          return { instrument, data: null }
        }
      })

      const results = await Promise.all(ltpPromises)
      
      // Process all results
      setMarketData(prevData => {
        const newData = { ...prevData }
        const changes = {}
        
        results.forEach(({ instrument, data }) => {
          if (data && data.data && typeof data.data === "object") {
            Object.keys(data.data).forEach((key) => {
              
              const instrumentData = data.data[key]
              if (instrumentData && instrumentData.last_price) {
                const previousPrice = previousDataRef.current[key]?.last_price
                const currentPrice = instrumentData.last_price

                if (previousPrice && previousPrice !== currentPrice) {
                  changes[key] = {
                    direction: currentPrice > previousPrice ? "up" : "down",
                    timestamp: Date.now(),
                  }
                }

                newData[key] = {
                  ...newData[key],
                  ...instrumentData,
                  tradingsymbol: key.split(":")[1],
                  exchange: key.split(":")[0],
                  instrument_key: key,
                }
              }
            })
          }
        })

        if (Object.keys(changes).length > 0) {
          setPriceChanges(changes)
          setTimeout(() => {
            setPriceChanges({})
          }, 2000)
        }

        previousDataRef.current = { ...newData }
        return newData
      })

      setLastUpdated(new Date())
      setError("")
    } catch (err) {
      console.error("LTP fetch error:", err)
      setError("Failed to fetch LTP data")
    } finally {
      setIsUpdating(false)
    }
  }, [accessToken, watchlist])

  const fetchOHLCData = useCallback(async () => {
    const token = accessToken || localStorage.getItem("zerodha_access_token")
    if (!token || watchlist.length === 0) return

    setIsUpdatingOHLC(true)
    
    try {
      console.log('Frontend: Making OHLC requests for', watchlist.length, 'instruments')
      
      const nseInstruments = watchlist.filter(inst => inst.startsWith("NSE:") || inst.startsWith("MCX:"))
      
      const ohlcPromises = nseInstruments.map(async (instrument) => {
        try {
          const response = await fetch(`${API_BASE_URL}/ohlc`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Kite-Version": "3",
              Authorization: `token ${API_KEY}:${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              instruments: [instrument], // Single instrument in array
            }),
          })

          if (response.ok) {
            const data = await response.json()
            return { instrument, data }
          }
          return { instrument, data: null }
        } catch (err) {
          console.error(`OHLC fetch error for ${instrument}:`, err)
          return { instrument, data: null }
        }
      })

      const results = await Promise.all(ohlcPromises)
      
      // Process all results
      setMarketData(prevData => {
        const newData = { ...prevData }
        const nseInstruments = watchlist.filter(inst => inst.startsWith("NSE:") || inst.startsWith("MCX:"))
        results.forEach(({ instrument, data }) => {
          if (data && data.data && typeof data.data === "object") {
            Object.keys(data.data).forEach((key) => {
              const missing = nseInstruments.filter(inst => !Object.keys(data.data).includes(inst));
              if (missing.length > 0) {
              console.warn("No data for instruments:", missing);
              }
              const instrumentData = data.data[key]
              if (instrumentData && instrumentData.ohlc) {
                newData[key] = {
                  ...newData[key],
                  ohlc: instrumentData.ohlc,
                  day_high: instrumentData.ohlc.high,
                  day_low: instrumentData.ohlc.low,
                  day_open: instrumentData.ohlc.open,
                  ...(instrumentData.last_price && { last_price: instrumentData.last_price }),
                  ...(instrumentData.net_change && { net_change: instrumentData.net_change }),
                  ...(instrumentData.change && { change: instrumentData.change }),
                }
              }
            })
          }
        })

        return newData
      })
    } catch (err) {
      console.error("OHLC fetch error:", err)
      setError("Failed to fetch OHLC data")
    } finally {
      setIsUpdatingOHLC(false)
    }
  }, [accessToken, watchlist])

  const fetchQuoteData = useCallback(async () => {
    const token = accessToken || localStorage.getItem("zerodha_access_token")
    if (!token || watchlist.length === 0) return

    setIsUpdatingQuote(true)
    
    try {
      console.log('Frontend: Making Quote requests for', watchlist.length, 'instruments')
      
      const nseInstruments = watchlist.filter(inst => inst.startsWith("NSE:") || inst.startsWith("MCX:"))
      
      const quotePromises = nseInstruments.map(async (instrument) => {
        try {
          const response = await fetch(`${API_BASE_URL}/quote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Kite-Version": "3",
              Authorization: `token ${API_KEY}:${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              instruments: [instrument], // Single instrument in array
            }),
          })

          if (response.ok) {
            const data = await response.json()
            return { instrument, data }
          }
          return { instrument, data: null }
        } catch (err) {
          console.error(`Quote fetch error for ${instrument}:`, err)
          return { instrument, data: null }
        }
      })

      const results = await Promise.all(quotePromises)
      
      // Process all results
      setMarketData(prevData => {
        const newData = { ...prevData }
        
        results.forEach(({ instrument, data }) => {
          if (data && data.data && typeof data.data === "object") {
            Object.keys(data.data).forEach((key) => {
              const instrumentData = data.data[key]
              if (instrumentData) {
                newData[key] = {
                  ...newData[key],
                  volume: instrumentData.volume ?? 0,
                  ...(instrumentData.average_price && { average_price: instrumentData.average_price }),
                  ...(instrumentData.oi && { oi: instrumentData.oi }),
                  ...(instrumentData.buy_quantity && { buy_quantity: instrumentData.buy_quantity }),
                  ...(instrumentData.sell_quantity && { sell_quantity: instrumentData.sell_quantity }),
                }
              }
            })
          }
        })

        return newData
      })
    } catch (err) {
      console.error("Quote fetch error:", err)
      setError("Failed to fetch volume data")
    } finally {
      setIsUpdatingQuote(false)
    }
  }, [accessToken, watchlist])

  const fetchInitialMarketData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchLTPData(),
        fetchOHLCData(), 
        fetchQuoteData()
      ])
    } catch (err) {
      setError("Failed to load initial market data")
      console.error("Initial data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [fetchLTPData, fetchOHLCData, fetchQuoteData])

  // Auto-refresh intervals
  useEffect(() => {
    if (isAuthenticated && accessToken && watchlist.length > 0) {
      if (ltpIntervalRef.current) clearInterval(ltpIntervalRef.current)
      if (ohlcIntervalRef.current) clearInterval(ohlcIntervalRef.current)
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)

      // LTP refresh every 5 seconds
      ltpIntervalRef.current = setInterval(() => {
        fetchLTPData()
      }, 5000)

      // OHLC refresh every 30 seconds
      ohlcIntervalRef.current = setInterval(() => {
        fetchOHLCData()
      }, 30000)

      // Quote (volume) refresh every 60 seconds
      quoteIntervalRef.current = setInterval(() => {
        fetchQuoteData()
      }, 60000)

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setRefreshCountdown((prev) => (prev <= 1 ? 5 : prev - 1))
      }, 1000)

      fetchInitialMarketData()
    }

    return () => {
      if (ltpIntervalRef.current) clearInterval(ltpIntervalRef.current)
      if (ohlcIntervalRef.current) clearInterval(ohlcIntervalRef.current)
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isAuthenticated, accessToken, watchlist, fetchLTPData, fetchOHLCData, fetchQuoteData, fetchInitialMarketData])

  // Load cached instruments
  useEffect(() => {
    const loadCachedInstruments = () => {
      try {
        const cachedInstruments = localStorage.getItem("instruments_cache");
        const cacheTimestamp = localStorage.getItem("instruments_cache_timestamp");
        
        if (cachedInstruments && cacheTimestamp) {
          const timestamp = parseInt(cacheTimestamp);
          const now = Date.now();
          
          if (now - timestamp < CACHE_DURATION) {
            const parsed = JSON.parse(cachedInstruments);
            setInstrumentsCache(parsed);
            instrumentsCacheRef.current = parsed;
            setLastCacheUpdate(new Date(timestamp));
            console.log(`Loaded ${parsed.length} instruments from cache`);
            return;
          }
        }
        
        setInstrumentsCache([]);
        instrumentsCacheRef.current = [];
        console.log("No cached instruments, starting with empty list");
        
      } catch (err) {
        console.error("Error loading cached instruments:", err);
        setInstrumentsCache([]);
        instrumentsCacheRef.current = [];
      }
    };

    loadCachedInstruments();
  }, []);

  const fetchInstrumentsFromAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API response not ok: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`Fetched ${data.data.length} instruments from API`);
        return data.data;
      } else {
        return [];
      }
    } catch (err) {
      console.error("Failed to fetch instruments from API:", err);
      return [];
    }
  };

  const updateInstrumentsCache = async () => {
    try {
      const apiInstruments = await fetchInstrumentsFromAPI();
      
      if (apiInstruments.length > 0) {
        setInstrumentsCache(apiInstruments);
        instrumentsCacheRef.current = apiInstruments;
        
        localStorage.setItem("instruments_cache", JSON.stringify(apiInstruments));
        localStorage.setItem("instruments_cache_timestamp", Date.now().toString());
        setLastCacheUpdate(new Date());
        
        console.log(`Updated cache with ${apiInstruments.length} instruments from API`);
        return apiInstruments;
      } else {
        return instrumentsCacheRef.current;
      }
    } catch (err) {
      console.error("Error updating instruments cache:", err);
      return instrumentsCacheRef.current;
    }
  };

  // Authentication functions
  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'zerodha_auth') {
        if (event.data.status === 'success' && event.data.token) {
          handleZerodhaCallback(event.data.token);
        } else {
          setError(event.data.error || 'Authentication failed');
          setLoading(false);
        }
        
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (data.authenticated) {
        setAccessToken(data.access_token);
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        const savedToken = localStorage.getItem("zerodha_access_token");
        const savedUser = localStorage.getItem("zerodha_user");
        
        if (savedToken && savedUser) {
          setAccessToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('Auth status check failed:', err);
      const savedToken = localStorage.getItem("zerodha_access_token");
      const savedUser = localStorage.getItem("zerodha_user");
      
      if (savedToken && savedUser) {
        setAccessToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const openLoginPopup = () => {
    if (!API_KEY) {
      setError('Zerodha API key is not configured');
      return;
    }
    
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    
    setError(null);
    setLoading(true);
    
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    const redirectUri = `${window.location.origin}/zerodha-callback.html`;
    const loginUrl = `https://kite.trade/connect/login?api_key=${API_KEY}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    try {
      popupRef.current = window.open(
        loginUrl,
        'ZerodhaLogin',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      if (!popupRef.current || popupRef.current.closed) {
        setError('Popup blocked! Please allow popups for this site.');
        setLoading(false);
        return;
      }

      const checkClosed = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          clearInterval(checkClosed);
          if (!isAuthenticated && loading) {
            setLoading(false);
            setError('Login window was closed before completing authentication');
          }
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkClosed);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        if (loading) {
          setLoading(false);
          setError('Login timeout. Please try again.');
        }
      }, 300000);

    } catch (err) {
      console.error('Failed to open popup:', err);
      setError('Failed to open login window. Please check your popup settings.');
      setLoading(false);
    }
  };

  const handleZerodhaCallback = async (requestToken) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          request_token: requestToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("zerodha_access_token", data.access_token);
        localStorage.setItem("zerodha_user", JSON.stringify(data.user));
        
        setIsAuthenticated(true);
        setAccessToken(data.access_token);
        setUser(data.user);
        setError('');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem("zerodha_watchlist", JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    if (isAuthenticated && instrumentsCacheRef.current.length === 0) {
      updateInstrumentsCache();
    }
  }, [isAuthenticated]);

  // Search functionality
  const searchInstruments = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    try {
      let apiResults = [];
      if (isAuthenticated) {
        try {
          const apiUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`;
          const response = await fetch(apiUrl, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              apiResults = data.data;
            }
          }
        } catch (apiErr) {
          console.warn("API search failed, falling back to cache:", apiErr);
        }
      }
      
      if (apiResults.length > 0) {
        const filteredApiResults = apiResults.filter(instrument => 
          instrument.exchange === "NSE" || instrument.exchange === "MCX"
        );
        
        if (filteredApiResults.length > 0) {
          setSearchResults(filteredApiResults.slice(0, 25));
          setShowSearchResults(true);
          setSelectedIndex(-1);
          return;
        }
      }
      
      // Fallback to cached search
      const searchTerm = query.toLowerCase();
      const cachedInstruments = instrumentsCacheRef.current || [];
      
      const filteredResults = cachedInstruments.filter((instrument) => {
        return (
          (instrument.tradingsymbol.toLowerCase().includes(searchTerm) ||
            instrument.name.toLowerCase().includes(searchTerm)) &&
          (instrument.exchange === "NSE" || instrument.exchange === "MCX")
        );
      });

      setSearchResults(filteredResults.slice(0, 25));
      setShowSearchResults(true);
      setSelectedIndex(-1);
      
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [isAuthenticated]);

  const refreshInstrumentsCache = async () => {
    setIsSearching(true);
    try {
      await updateInstrumentsCache();
      if (searchQuery) {
        await searchInstruments(searchQuery);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchInstruments(query)
    }, 200)
  }

  const handleSearchKeyDown = (e) => {
    if (!showSearchResults || searchResults.length === 0) {
      if (e.key === "Enter" && searchQuery.length > 0) {
        searchInstruments(searchQuery)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          addToWatchlist(searchResults[selectedIndex])
        }
        break
      case "Escape":
        setShowSearchResults(false)
        setSelectedIndex(-1)
        searchInputRef.current?.blur()
        break
    }
  }

  const handleSearchFocus = () => {
    if (searchQuery.length > 0 && searchResults.length > 0) {
      setShowSearchResults(true)
    }
  }

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const addToWatchlist = (instrument) => {
    const instrumentKey = instrument.key
    if (!watchlist.includes(instrumentKey)) {
      setWatchlist((prev) => [...prev, instrumentKey])
      setSearchQuery("")
      setShowSearchResults(false)
      setSelectedIndex(-1)
      searchInputRef.current?.blur()
    } else {
      setSearchQuery("")
      setShowSearchResults(false)
      setSelectedIndex(-1)
    }
  }

  const removeFromWatchlist = (instrumentKey) => {
    setWatchlist((prev) => prev.filter((item) => item !== instrumentKey))
    setMarketData((prev) => {
      const newData = { ...prev }
      delete newData[instrumentKey]
      return newData
    })
  }

  const logout = async () => {
    if (ltpIntervalRef.current) clearInterval(ltpIntervalRef.current);
    if (ohlcIntervalRef.current) clearInterval(ohlcIntervalRef.current);
    if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    setIsAuthenticated(false);
    setAccessToken("");
    setUser(null);
    setMarketData({});
    setLastUpdated(null);
    setRefreshCountdown(5);
    setPriceChanges({});
    previousDataRef.current = {};

    localStorage.removeItem("zerodha_access_token");
    localStorage.removeItem("zerodha_user");
  };

  // Utility functions
  const formatPrice = (price) => {
    if (!price) return "N/A"
    return `₹${Number.parseFloat(price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatChange = (data) => {
    const lastPrice = data.last_price || 0
    const change = data.net_change || data.change || 0
    const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0
    const isPositive = change >= 0

    return (
      <div className={`text-right ${isPositive ? "text-green-600" : "text-red-600"}`}>
        <div className="font-medium">
          {isPositive ? "+" : ""}
          {change.toFixed(2)}
        </div>
        <div className="text-xs">({changePercent.toFixed(2)}%)</div>
      </div>
    )
  }

  const getInstrumentName = (instrument, data) => {
    if (data.tradingsymbol) return data.tradingsymbol
    return instrument.split(":")[1] || instrument
  }

  const getMarketStatus = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 100 + minutes

    const marketOpen = 915
    const marketClose = 1530

    if (currentTime >= marketOpen && currentTime <= marketClose) {
      return { status: "OPEN", color: "text-green-600", bg: "bg-green-100" }
    } else {
      return { status: "CLOSED", color: "text-red-600", bg: "bg-red-100" }
    }
  }

  const PriceCell = ({ instrument, data }) => {
    const change = priceChanges[instrument]
    const hasData = data.last_price !== undefined

    return (
      <div
        className={`text-sm font-medium text-gray-900 transition-all duration-300 ${
          change ? (change.direction === "up" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800") : ""
        }`}
        style={{
          padding: change ? "2px 4px" : "0",
          borderRadius: change ? "4px" : "0",
        }}
      >
        {hasData ? formatPrice(data.last_price) : <span className="text-gray-400">Loading...</span>}
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Zerodha Authentication</h2>
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="text-lg font-medium text-blue-700">One-Click Login</h3>
              <p className="mt-1 text-blue-600">
                Click below to securely authenticate with Zerodha.
              </p>
            </div>
            
            <div className="flex flex-col items-center py-4">
              <button
                onClick={openLoginPopup}
                disabled={loading}
                className={`px-8 py-3 rounded-lg font-medium flex items-center ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-600 text-white hover:bg-orange-700 transition-colors'
                }`}
              >
                {loading ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting...
                  </>
                ) : 'Login with Zerodha'}
              </button>
              
              <p className="mt-3 text-sm text-gray-500 text-center">
                You'll be redirected to Zerodha's secure login page
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    setLoading(false);
                  }}
                  className="mt-2 text-red-700 hover:text-red-900 underline text-sm"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Troubleshooting</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Ensure popups are allowed for this site</li>
                <li>Make sure you have an active Zerodha account</li>
                <li>Check that your API key is properly configured</li>
                <li>Authentication token is valid until market close</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const marketStatus = getMarketStatus()

  // Main watchlist interface
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Live Market Watchlist</h2>
              {user && <p className="text-sm text-gray-600 mt-1">Welcome, {user.user_name}</p>}
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs text-gray-500">
                  Tracking {watchlist.length} instruments • {Object.keys(marketData).length} with live data
                </p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${marketStatus.bg} ${marketStatus.color}`}>
                  Market {marketStatus.status}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  LTP: {refreshCountdown}s
                </span>
                {isUpdating && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
                    LTP ↻
                  </span>
                )}
                {isUpdatingOHLC && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 animate-pulse">
                    OHLC ↻
                  </span>
                )}
                {isUpdatingQuote && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 animate-pulse">
                    VOL ↻
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => fetchInitialMarketData()}
                disabled={loading || isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
              >
                {loading || isUpdating ? "🔄 Updating..." : "🔄 Refresh All"}
              </button>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-lg">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Add Instruments to Watchlist</label>
              <div className="flex items-center gap-2">
                {lastCacheUpdate && (
                  <span className="text-xs text-gray-500">
                    Cache: {lastCacheUpdate.toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={refreshInstrumentsCache}
                  disabled={isSearching}
                  className="text-xs text-blue-600 hover:text-blue-800 underline disabled:text-gray-400"
                  title="Refresh instruments cache"
                >
                  {isSearching ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={handleSearchFocus}
                placeholder="Search NSE stocks & MCX commodities... (e.g., RELIANCE, GOLD, TCS)"
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoComplete="off"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div
                ref={searchDropdownRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto"
              >
                {searchResults.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200 flex justify-between">
                      <span>{searchResults.length} results found</span>
                      <span className="text-blue-600">API Data</span>
                    </div>
                    {searchResults.map((result, index) => (
                      <div
                        key={result.key}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                          index === selectedIndex ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                        }`}
                        onClick={() => addToWatchlist(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900 text-sm">{result.tradingsymbol}</div>
                              <div
                                className={`text-xs text-white px-2 py-0.5 rounded font-medium ${
                                  result.exchange === "NSE" ? "bg-blue-600" : "bg-orange-600"
                                }`}
                              >
                                {result.exchange}
                              </div>
                              {result.expiry && (
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {new Date(result.expiry).toLocaleDateString("en-IN", {
                                    month: "short",
                                    year: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 truncate mt-1">{result.name}</div>
                          </div>
                          <div className="ml-2">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : searchQuery.length > 0 && !isSearching ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-300 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <div className="text-sm">No instruments found for "{searchQuery}"</div>
                    <div className="text-xs text-gray-400 mt-1">Try searching with different keywords</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          <div className="mt-2 text-xs text-gray-500 flex justify-between">
            <span>💡 Real-time API data only: LTP (5s) • OHLC (30s) • Volume (60s)</span>
            <span>📊 {instrumentsCacheRef.current.length} instruments from API</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button onClick={() => setError("")} className="mt-2 text-sm text-red-600 underline">
                Dismiss
              </button>
            </div>
          )}

          {Object.keys(marketData).length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Market Data</h3>
              <p className="text-gray-600 mb-4">Click refresh to load live market data for your watchlist</p>
              <button
                onClick={() => fetchInitialMarketData()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load Market Data
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading live market data...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instrument
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        LTP
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Low
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {watchlist.map((instrument, index) => {
                      const data = marketData[instrument] || {}
                      const hasData = data.last_price !== undefined

                      return (
                        <tr key={instrument} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getInstrumentName(instrument, data)}
                                </div>
                                <div
                                  className={`text-sm font-medium ${data.exchange === "MCX" ? "text-orange-600" : "text-blue-600"}`}
                                >
                                  {data.exchange || instrument.split(":")[0]}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <PriceCell instrument={instrument} data={data} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {hasData ? formatChange(data) : <span className="text-gray-400 text-sm">N/A</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {typeof data.volume === "number" && data.volume > 0
                              ? data.volume.toLocaleString("en-IN")
                              : <span className="text-gray-400">No data</span>} 
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {data.ohlc?.high
                              ? formatPrice(data.ohlc.high)
                              : data.day_high
                                ? formatPrice(data.day_high)
                                : <span className="text-gray-400">No data</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {data.ohlc?.low
                              ? formatPrice(data.ohlc.low)
                              : data.day_low
                                ? formatPrice(data.day_low)
                                : <span className="text-gray-400">No data</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => removeFromWatchlist(instrument)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                              title="Remove from watchlist"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lastUpdated && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Real-time API data • LTP: 5s • OHLC: 30s • Volume: 60s
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LiveWatchlist