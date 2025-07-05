/*
"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog"
import { toast } from "sonner"
import { supabase } from "../../../utils/supabase"


export default function UserTransactions() {
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [transactions, setTransactions] = useState([])
  const [userCoins, setUserCoins] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [ws, setWs] = useState(null)
  const [userId, setUserId] = useState(null)

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // Get user ID from localStorage
  useEffect(() => {
    const id = localStorage.getItem("id")
    if (!id) {
      console.error("No user ID found")
      return
    }
    setUserId(id)
  }, [])


  const handleTransactionUpdate = (transaction) => {
    setTransactions(prevTransactions => {
      // Ensure prevTransactions is an array
      const currentTransactions = Array.isArray(prevTransactions) ? prevTransactions : []
      
      // Check if transaction already exists
      const existingIndex = currentTransactions.findIndex(t => t.id === transaction.id)
      
      if (existingIndex >= 0) {
        // Update existing transaction
        const updated = [...currentTransactions]
        updated[existingIndex] = transaction
        return updated
      } else {
        // Add new transaction at the beginning
        return [transaction, ...currentTransactions]
      }
    })

    // Show toast notification if transaction was completed
    if (transaction.status === 'COMPLETE') {
      toast.success(
        `Transaction ${transaction.type.toLowerCase()} of 🪙${transaction.amount.toFixed(2)} completed`
      )
    }
  }

  // Fetch user data and transactions
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      
      setIsLoading(true)
      
      try {
        // Get user coins balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('coins')
          .eq('id', userId)
          .single()
        
        if (userError) throw userError
        setUserCoins(userData?.coins || 0)
        
        // Get user transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (txError) throw txError
        // Ensure txData is an array
        setTransactions(Array.isArray(txData) ? txData : [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load transactions")
        // Set empty arrays on error
        setTransactions([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
    
    // Set up realtime subscription for transactions
    const channel = supabase
      .channel('user_transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        // Update transactions when changes occur
        if (payload.eventType === 'INSERT') {
          setTransactions(prev => {
            const currentTransactions = Array.isArray(prev) ? prev : []
            return [payload.new, ...currentTransactions]
          })
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => {
            const currentTransactions = Array.isArray(prev) ? prev : []
            return currentTransactions.map(tx => 
              tx.id === payload.new.id ? payload.new : tx
            )
          })
          
          // Update balance if transaction was completed
          if (payload.new.status === 'COMPLETE') {
            const { data: userData } = await supabase
              .from('users')
              .select('coins')
              .eq('id', userId)
              .single()
            
            setUserCoins(userData?.coins || 0)
          }
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Ensure transactions is always an array before filtering
  const safeTransactions = Array.isArray(transactions) ? transactions : []
  
  const deposits = safeTransactions.filter(t => t?.type === 'DEPOSIT' && t?.status === 'COMPLETE')
  const withdrawals = safeTransactions.filter(t => t?.type === 'WITHDRAW' && t?.status === 'COMPLETE')
  const pendingTransactions = safeTransactions.filter(t => t?.status === 'PENDING')

  const totalDeposits = deposits.reduce((sum, t) => sum + (t?.amount || 0), 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t?.amount || 0), 0)
  const balance = userCoins || 0

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const depositAmount = Number(amount)
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'DEPOSIT',
          amount: depositAmount,
          status: 'PENDING'
        }])
        .select()
      
      if (error) throw error
      
      setAmount("")
      setIsDepositOpen(false)
      toast.success("Deposit request submitted for approval")
    } catch (error) {
      console.error("Error creating deposit:", error)
      toast.error("Failed to create deposit request")
    }
  }

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const withdrawAmount = Number(amount)
    
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance")
      return
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'WITHDRAW',
          amount: withdrawAmount,
          status: 'PENDING'
        }])
        .select()
      
      if (error) throw error
      
      setAmount("")
      setIsWithdrawOpen(false)
      toast.success("Withdrawal request submitted for approval")
    } catch (error) {
      console.error("Error creating withdrawal:", error)
      toast.error("Failed to create withdrawal request")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">User not authenticated. Please log in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coin Transactions</h1>
          <p className="text-gray-500">Manage your coin balance</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-primary">
                <ArrowUp className="mr-2 h-4 w-4" />
                Deposit
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Deposit Coins</DialogTitle>
                <DialogDescription>Add coins to your account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="amount" className="label text-right">
                    Amount
                  </label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">🪙</span>
                    <input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input pl-7"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <button type="button" className="btn btn-primary" onClick={handleDeposit}>
                  Submit Deposit Request
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-outline">
                <ArrowDown className="mr-2 h-4 w-4" />
                Withdraw
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Withdraw Coins</DialogTitle>
                <DialogDescription>Withdraw coins from your account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="withdraw-amount" className="label text-right">
                    Amount
                  </label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">🪙</span>
                    <input
                      id="withdraw-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input pl-7"
                      placeholder="0.00"
                      min="0"
                      max={balance}
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="col-span-3 text-xs text-gray-500 text-right">
                  Available Balance: 🪙 {balance.toFixed(2)}
                </div>
              </div>
              <DialogFooter>
                <button type="button" className="btn btn-primary" onClick={handleWithdraw}>
                  Submit Withdrawal Request
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Current Balance</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {balance.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Available coins</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalWithdrawals.toFixed(2)}</div>
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
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Transaction History</h3>
                <p className="card-description">All your coin transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        safeTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="font-mono text-sm">{tx.id}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.type === "DEPOSIT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td>🪙 {tx.amount.toFixed(2)}</td>
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
                            <td>{formatDate(tx.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="deposits">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Deposits</h3>
                <p className="card-description">Your deposit transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No deposits found
                          </td>
                        </tr>
                      ) : (
                        deposits.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : transaction.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="withdrawals">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Withdrawals</h3>
                <p className="card-description">Your withdrawal transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No withdrawals found
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : transaction.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="pending">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pending Transactions</h3>
                <p className="card-description">Transactions awaiting approval</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No pending transactions
                          </td>
                        </tr>
                      ) : (
                        pendingTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === "DEPOSIT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
  */

"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog"
import { toast } from "sonner"
import { supabase } from "../../../utils/supabase"


export default function UserTransactions() {
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [transactions, setTransactions] = useState([])
  const [userCoins, setUserCoins] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // Get user ID from localStorage
  useEffect(() => {
    const id = localStorage.getItem("id")
    if (!id) {
      console.error("No user ID found")
      return
    }
    setUserId(id)
  }, [])


  const handleTransactionUpdate = (transaction) => {
    setTransactions(prevTransactions => {
      // Ensure prevTransactions is an array
      const currentTransactions = Array.isArray(prevTransactions) ? prevTransactions : []
      
      // Check if transaction already exists
      const existingIndex = currentTransactions.findIndex(t => t.id === transaction.id)
      
      if (existingIndex >= 0) {
        // Update existing transaction
        const updated = [...currentTransactions]
        updated[existingIndex] = transaction
        return updated
      } else {
        // Add new transaction at the beginning
        return [transaction, ...currentTransactions]
      }
    })

    // Show toast notification if transaction was completed
    if (transaction.status === 'COMPLETE') {
      toast.success(
        `Transaction ${transaction.type.toLowerCase()} of 🪙${transaction.amount.toFixed(2)} completed`
      )
    }
  }

  // Fetch user data and transactions
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      
      setIsLoading(true)
      
      try {
        // Get user coins balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('coins')
          .eq('id', userId)
          .single()
        
        if (userError) throw userError
        setUserCoins(userData?.coins || 0)
        
        // Get user transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (txError) throw txError
        // Ensure txData is an array
        setTransactions(Array.isArray(txData) ? txData : [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load transactions")
        // Set empty arrays on error
        setTransactions([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
    
    // Set up realtime subscription for transactions
    const channel = supabase
      .channel('user_transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        // Update transactions when changes occur
        if (payload.eventType === 'INSERT') {
          setTransactions(prev => {
            const currentTransactions = Array.isArray(prev) ? prev : []
            return [payload.new, ...currentTransactions]
          })
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => {
            const currentTransactions = Array.isArray(prev) ? prev : []
            return currentTransactions.map(tx => 
              tx.id === payload.new.id ? payload.new : tx
            )
          })
          
          // Update balance if transaction was completed
          if (payload.new.status === 'COMPLETE') {
            const { data: userData } = await supabase
              .from('users')
              .select('coins')
              .eq('id', userId)
              .single()
            
            setUserCoins(userData?.coins || 0)
          }
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Ensure transactions is always an array before filtering
  const safeTransactions = Array.isArray(transactions) ? transactions : []
  
  const deposits = safeTransactions.filter(t => t?.type === 'DEPOSIT' && t?.status === 'COMPLETE')
  const withdrawals = safeTransactions.filter(t => t?.type === 'WITHDRAW' && t?.status === 'COMPLETE')
  const pendingTransactions = safeTransactions.filter(t => t?.status === 'PENDING')

  const totalDeposits = deposits.reduce((sum, t) => sum + (t?.amount || 0), 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t?.amount || 0), 0)
  const balance = userCoins || 0

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const depositAmount = Number(amount)
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'DEPOSIT',
          amount: depositAmount,
          status: 'PENDING'
        }])
        .select()
      
      if (error) throw error
      
      setAmount("")
      setIsDepositOpen(false)
      toast.success("Deposit request submitted for approval")
      
      // Refresh the page after successful deposit
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Error creating deposit:", error)
      toast.error("Failed to create deposit request")
    }
  }

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const withdrawAmount = Number(amount)
    
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance")
      return
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: 'WITHDRAW',
          amount: withdrawAmount,
          status: 'PENDING'
        }])
        .select()
      
      if (error) throw error
      
      setAmount("")
      setIsWithdrawOpen(false)
      toast.success("Withdrawal request submitted for approval")
      
      // Refresh the page after successful withdrawal
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Error creating withdrawal:", error)
      toast.error("Failed to create withdrawal request")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">User not authenticated. Please log in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coin Transactions</h1>
          <p className="text-gray-500">Manage your coin balance</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-primary">
                <ArrowUp className="mr-2 h-4 w-4" />
                Deposit
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">Deposit Coins</DialogTitle>
                <DialogDescription className="text-center text-gray-600">
                  Add coins to your account
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <label htmlFor="amount" className="block text-lg font-semibold mb-3">
                      Amount
                    </label>
                    <div className="relative max-w-xs mx-auto">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🪙</span>
                      <input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 text-xl font-semibold text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="justify-center">
                <button 
                  type="button" 
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={handleDeposit}
                >
                  Submit Deposit Request
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-outline">
                <ArrowDown className="mr-2 h-4 w-4" />
                Withdraw
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">Withdraw Coins</DialogTitle>
                <DialogDescription className="text-center text-gray-600">
                  Withdraw coins from your account
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <label htmlFor="withdraw-amount" className="block text-lg font-semibold mb-3">
                      Amount
                    </label>
                    <div className="relative max-w-xs mx-auto">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🪙</span>
                      <input
                        id="withdraw-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 text-xl font-semibold text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0"
                        max={balance}
                        step="0.01"
                      />
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      Available Balance: 🪙 {balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="justify-center">
                <button 
                  type="button" 
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={handleWithdraw}
                >
                  Submit Withdrawal Request
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Current Balance</h3>
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {balance.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Available coins</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">🪙 {totalWithdrawals.toFixed(2)}</div>
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
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="all" className="w-full">
          {/* <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList> */}
          <TabsContent value="all">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Transaction History</h3>
                <p className="card-description">All your coin transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        safeTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="font-mono text-sm">{tx.id}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tx.type === "DEPOSIT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td>🪙 {tx.amount.toFixed(2)}</td>
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
                            <td>{formatDate(tx.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="deposits">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Deposits</h3>
                <p className="card-description">Your deposit transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No deposits found
                          </td>
                        </tr>
                      ) : (
                        deposits.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : transaction.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="withdrawals">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Withdrawals</h3>
                <p className="card-description">Your withdrawal transactions</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No withdrawals found
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === "COMPLETE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : transaction.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="pending">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pending Transactions</h3>
                <p className="card-description">Transactions awaiting approval</p>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No pending transactions
                          </td>
                        </tr>
                      ) : (
                        pendingTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>#{transaction.id}</td>
                            <td>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === "DEPOSIT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td>🪙 {transaction.amount.toFixed(2)}</td>
                            <td>{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}