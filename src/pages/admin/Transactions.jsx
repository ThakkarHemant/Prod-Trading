/*
"use client"
import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Search, RefreshCw } from "../../components/icons"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"
import { supabase } from "../../../utils/supabase"
import { toast } from "sonner"
import { Button } from "../../components/ui/Button"

export default function AdminTransactions() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // Fetch transactions and user data
  const fetchData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true)
    else setIsRefreshing(true)
    
    try {
      // Get all transactions with user data (only available columns)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, user:user_id(id, role, coins)')
        .order('created_at', { ascending: false })
      
      if (txError) throw txError
      
      // Create users map for quick lookup
      const usersMap = {}
      txData?.forEach(tx => {
        if (tx.user) {
          usersMap[tx.user.id] = tx.user
        }
      })
      
      setTransactions(txData || [])
      setUsers(usersMap)
      
      if (!showLoader) {
        toast.success("Transactions refreshed")
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      if (showLoader) setIsLoading(false)
      else setIsRefreshing(false)
    }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchData(false)
  }

  useEffect(() => {
    // Initial fetch
    fetchData(true)
    
    // Set up interval to fetch every 1 minute (60000ms)
    const interval = setInterval(() => fetchData(false), 60000)
    
    // Set up realtime subscription
    const channel = supabase
      .channel('admin_transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, async (payload) => {
        // Handle realtime updates
        if (payload.eventType === 'INSERT') {
          // Fetch user data for new transaction
          if (payload.new.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, role, coins')
              .eq('id', payload.new.user_id)
              .single()
            
            if (userData) {
              setUsers(prev => ({
                ...prev,
                [payload.new.user_id]: userData
              }))
              
              setTransactions(prev => [{
                ...payload.new,
                user: userData
              }, ...prev])
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => prev.map(tx => 
            tx.id === payload.new.id ? {
              ...payload.new,
              user: users[payload.new.user_id] || tx.user // Use existing user data from users state
            } : tx
          ))
        } else if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(tx => tx.id !== payload.old.id))
        }
      })
      .subscribe()
    
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredTransactions = transactions.filter((tx) => {
    const user = tx.user || {}
    const matchesSearch =
      (user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || tx.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesType = typeFilter === "all" || tx.type.toLowerCase() === typeFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesType
  })

  // Fix the deposits and withdrawals calculation with proper case handling
  const deposits = transactions.filter(t => t.type?.toUpperCase() === 'DEPOSIT' && t.status?.toUpperCase() === 'COMPLETE')
  const withdrawals = transactions.filter(t => t.type?.toUpperCase() === 'WITHDRAW' && t.status?.toUpperCase() === 'COMPLETE')
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING')
  const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0)
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

  const handleStatusChange = async (id, newStatus) => {
    setIsUpdating(true)
    try {
      // Update transaction status
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: newStatus.toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      // If status changed to COMPLETE, update user's coin balance
      if (newStatus === 'complete') {
        const tx = transactions.find(t => t.id === id)
        if (tx && tx.user_id) {
          // Get current user coins
          const { data: userData } = await supabase
            .from('users')
            .select('coins')
            .eq('id', tx.user_id)
            .single()
          
          const currentCoins = userData?.coins || 0
          const newCoins = tx.type === 'DEPOSIT' 
            ? currentCoins + tx.amount 
            : currentCoins - tx.amount
            
          // Update user coins
          await supabase
            .from('users')
            .update({ coins: newCoins })
            .eq('id', tx.user_id)
        }
      }
      
      // Immediately update the local state to reflect the change
      setTransactions(prev => prev.map(tx => 
        tx.id === id ? {
          ...tx,
          status: newStatus.toUpperCase(),
          updated_at: new Date().toISOString()
        } : tx
      ))
      
      toast.success(`Transaction ${id.substring(0, 8)} status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction status")
    } finally {
      setIsUpdating(false)
    }
  }



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coin Transactions</h1>
            <p className="text-gray-500">Manage all user coin transactions</p>
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalDeposits.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalWithdrawals.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Completed withdrawals</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Pending Transactions</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{pendingTransactions.length}</div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Pending Amount</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-500">In pending transactions</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search by user ID, role or TX ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full sm:w-[250px]"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const user = tx.user || {}
                  return (
                    <tr key={tx.id}>
                      <td className="font-mono text-sm">{tx.id.substring(0, 8)}...</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">User ID: {user.id || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">Role: {user.role || 'N/A'}</span>
                          <span className="text-xs text-gray-500">Coins: {(user.coins || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td>🪙 {tx.amount.toLocaleString()}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'COMPLETE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="text-sm">{formatDate(tx.created_at)}</td>
                      <td>
                        {tx.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(tx.id, 'complete')}
                              disabled={isUpdating}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 px-4 py-1.5 text-sm font-medium"
                            >
                              ✓ Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(tx.id, 'cancelled')}
                              disabled={isUpdating}
                              className="bg-red-500 hover:bg-red-600 text-white border-red-500 px-4 py-1.5 text-sm font-medium"
                            >
                              ✕ Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
  */

"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, Search, RefreshCw } from "../../components/icons"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"
import { supabase } from "../../../utils/supabase"
import { toast } from "sonner"
import { Button } from "../../components/ui/Button"

export default function AdminTransactions() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // Fetch transactions and user data
  const fetchData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      // Get all transactions with user data (only available columns)
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*, user:user_id(id, role, coins)")
        .order("created_at", { ascending: false })

      if (txError) throw txError

      // Create users map for quick lookup
      const usersMap = {}
      txData?.forEach((tx) => {
        if (tx.user) {
          usersMap[tx.user.id] = tx.user
        }
      })

      setTransactions(txData || [])
      setUsers(usersMap)

      if (!showLoader) {
        toast.success("Transactions refreshed")
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      if (showLoader) setIsLoading(false)
      else setIsRefreshing(false)
    }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchData(false)
  }

  useEffect(() => {
    // Initial fetch
    fetchData(true)

    // Set up interval to fetch every 1 minute (60000ms)
    const interval = setInterval(() => fetchData(false), 60000)

    // Set up realtime subscription
    const channel = supabase
      .channel("admin_transactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        async (payload) => {
          // Handle realtime updates
          if (payload.eventType === "INSERT") {
            // Fetch user data for new transaction
            if (payload.new.user_id) {
              const { data: userData } = await supabase
                .from("users")
                .select("id, role, coins")
                .eq("id", payload.new.user_id)
                .single()

              if (userData) {
                setUsers((prev) => ({
                  ...prev,
                  [payload.new.user_id]: userData,
                }))

                setTransactions((prev) => [
                  {
                    ...payload.new,
                    user: userData,
                  },
                  ...prev,
                ])
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setTransactions((prev) =>
              prev.map((tx) =>
                tx.id === payload.new.id
                  ? {
                      ...payload.new,
                      user: users[payload.new.user_id] || tx.user, // Use existing user data from users state
                    }
                  : tx,
              ),
            )
          } else if (payload.eventType === "DELETE") {
            setTransactions((prev) => prev.filter((tx) => tx.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredTransactions = transactions.filter((tx) => {
    const user = tx.user || {}
    const matchesSearch =
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tx.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesType = typeFilter === "all" || tx.type.toLowerCase() === typeFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesType
  })

  // Fix the deposits and withdrawals calculation with proper case handling
  const deposits = transactions.filter(
    (t) => t.type?.toUpperCase() === "DEPOSIT" && t.status?.toUpperCase() === "COMPLETE",
  )
  const withdrawals = transactions.filter(
    (t) => t.type?.toUpperCase() === "WITHDRAW" && t.status?.toUpperCase() === "COMPLETE",
  )
  const pendingTransactions = transactions.filter((t) => t.status === "PENDING")

  const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0)
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

  const handleStatusChange = async (id, newStatus) => {
    setIsUpdating(true)
    try {
      // Update transaction status
      const { error } = await supabase
        .from("transactions")
        .update({
          status: newStatus.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      // If status changed to COMPLETE, update user's coin balance
      if (newStatus === "complete") {
        const tx = transactions.find((t) => t.id === id)
        if (tx && tx.user_id) {
          // Get current user coins
          const { data: userData } = await supabase.from("users").select("coins").eq("id", tx.user_id).single()

          const currentCoins = userData?.coins || 0
          const newCoins = tx.type === "DEPOSIT" ? currentCoins + tx.amount : currentCoins - tx.amount

          // Update user coins
          await supabase.from("users").update({ coins: newCoins }).eq("id", tx.user_id)
        }
      }

      // Immediately update the local state to reflect the change
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? {
                ...tx,
                status: newStatus.toUpperCase(),
                updated_at: new Date().toISOString(),
              }
            : tx,
        ),
      )

      toast.success(`Transaction ${id.substring(0, 8)} status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction status")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 sm:h-64 p-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Coin Transactions</h1>
            <p className="text-sm sm:text-base text-gray-500">Manage all user coin transactions</p>
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto justify-center bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-xs sm:text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
          </div>
          <div className="card-content">
            <div className="text-lg sm:text-2xl font-bold break-all">🪙 {totalDeposits.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-xs sm:text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
          </div>
          <div className="card-content">
            <div className="text-lg sm:text-2xl font-bold break-all">🪙 {totalWithdrawals.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Completed withdrawals</p>
          </div>
        </div>

        <div className="card col-span-2 sm:col-span-1">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-xs sm:text-sm font-medium">Pending Transactions</h3>
          </div>
          <div className="card-content">
            <div className="text-lg sm:text-2xl font-bold">{pendingTransactions.length}</div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </div>
        </div>

        <div className="card col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-xs sm:text-sm font-medium">Pending Amount</h3>
          </div>
          <div className="card-content">
            <div className="text-lg sm:text-2xl font-bold break-all">🪙 {pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-500">In pending transactions</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <input
              placeholder="Search by user ID, role or TX ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table/Cards */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-base sm:text-lg">All Transactions</h3>
            <p className="card-description text-sm">Complete transaction history across all users</p>
          </div>
          <div className="card-content">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>TX ID</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const user = tx.user || {}
                        return (
                          <tr key={tx.id}>
                            <td className="font-mono text-sm">{tx.id.substring(0, 8)}...</td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-medium">User ID: {user.id || "Unknown"}</span>
                                <span className="text-xs text-gray-500">Role: {user.role || "N/A"}</span>
                                <span className="text-xs text-gray-500">
                                  Coins: {(user.coins || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.type === "DEPOSIT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td>🪙 {tx.amount.toLocaleString()}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tx.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="text-sm">{formatDate(tx.created_at)}</td>
                            <td>
                              {tx.status === "PENDING" && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(tx.id, "complete")}
                                    disabled={isUpdating}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 px-4 py-1.5 text-sm font-medium"
                                  >
                                    ✓ Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(tx.id, "cancelled")}
                                    disabled={isUpdating}
                                    className="bg-red-500 hover:bg-red-600 text-white border-red-500 px-4 py-1.5 text-sm font-medium"
                                  >
                                    ✕ Reject
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tablet Horizontal Scroll Table */}
            <div className="hidden md:block lg:hidden overflow-x-auto">
              <div className="min-w-[700px]">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>TX ID</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const user = tx.user || {}
                        return (
                          <tr key={tx.id}>
                            <td className="font-mono text-sm">{tx.id.substring(0, 8)}...</td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{user.id || "Unknown"}</span>
                                <span className="text-xs text-gray-500">{user.role || "N/A"}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.type === "DEPOSIT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="text-sm">🪙 {tx.amount.toLocaleString()}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tx.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td>
                              {tx.status === "PENDING" && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(tx.id, "complete")}
                                    disabled={isUpdating}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 text-xs"
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(tx.id, "cancelled")}
                                    disabled={isUpdating}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const user = tx.user || {}
                  return (
                    <div key={tx.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900">User: {user.id || "Unknown"}</h4>
                          <p className="text-xs text-gray-500 font-mono">TX: {tx.id.substring(0, 8)}...</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tx.type === "DEPOSIT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tx.type}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tx.status === "COMPLETE"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Role:</span>
                          <p className="font-medium">{user.role || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">User Coins:</span>
                          <p className="font-medium">🪙 {(user.coins || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Amount and Date */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <div>
                          <span className="text-xs text-gray-500">Amount:</span>
                          <p className="font-medium text-lg">🪙 {tx.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Date:</span>
                          <p className="text-xs font-medium">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {tx.status === "PENDING" && (
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(tx.id, "complete")}
                            disabled={isUpdating}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium py-2"
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(tx.id, "cancelled")}
                            disabled={isUpdating}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2"
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
