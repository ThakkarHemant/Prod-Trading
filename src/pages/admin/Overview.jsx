
"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../utils/supabase"
import { Activity, ArrowDown, ArrowUp, Users } from "../../components/icons"
import { toast } from "sonner"

function AdminOverview() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    deposits: 0,
    withdrawals: 0,
    tradeLastMonth: 0,
    tradeThisMonth: 0,
  })
  const [activities, setActivities] = useState([])
  const [monthlyActivity, setMonthlyActivity] = useState([])

  const fetchData = async () => {
    setIsLoading(true)

    try {
      // Fetch total users (only count users, not admins)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, role")
        .neq("role", "admin") // Exclude admin users
      if (usersError) throw usersError

      const totalUsers = usersData.length

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
      if (txError) throw txError

      // Fetch trades
      const { data: tradesData, error: tradesError } = await supabase
        .from("trades")
        .select("*")
        .order("timestamp", { ascending: false })
      if (tradesError) throw tradesError

      // Try to fetch users with username, fallback to basic if column doesn't exist
      let userLookup = {}
      try {
        const { data: allUsersData, error: allUsersError } = await supabase
          .from("users")
          .select("id, username")
          .neq("role", "admin") // Exclude admin users
        
        if (allUsersError && allUsersError.code === "42703") {
          // Username column doesn't exist, create basic lookup (excluding admins)
          usersData.forEach(user => {
            userLookup[user.id] = `User ${user.id}`
          })
        } else if (allUsersError) {
          throw allUsersError
        } else {
          // Username column exists
          allUsersData.forEach(user => {
            userLookup[user.id] = user.username || `User ${user.id}`
          })
        }
      } catch (error) {
        // Fallback to basic user lookup (excluding admins)
        usersData.forEach(user => {
          userLookup[user.id] = `User ${user.id}`
        })
      }

      // Process stats
      let deposits = 0
      let withdrawals = 0
      let tradeThisMonth = 0
      let tradeLastMonth = 0

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Calculate deposits and withdrawals (only COMPLETE transactions)
      txData.forEach((tx) => {
        // Convert to lowercase for comparison and only count COMPLETE transactions
        const txType = tx.type?.toLowerCase()
        const isComplete = tx.status?.toUpperCase() === 'COMPLETE'
        
        console.log(`Processing transaction: type=${tx.type}, amount=${tx.amount}, status=${tx.status}, isComplete=${isComplete}`)
        
        if (isComplete) {
          if (txType === "deposit") {
            deposits += tx.amount || 0
            console.log(`Added deposit: ${tx.amount}, total deposits now: ${deposits}`)
          }
          else if (txType === "withdraw" || txType === "withdrawal") {
            withdrawals += tx.amount || 0
            console.log(`Added withdrawal: ${tx.amount}, total withdrawals now: ${withdrawals}`)
          }
        } else {
          console.log(`Skipped ${txType} of ${tx.amount} because status is ${tx.status}`)
        }
      })

      console.log(`Final calculations - Deposits: ${deposits}, Withdrawals: ${withdrawals}`)

      // Calculate monthly trade counts
      tradesData.forEach((trade) => {
        const tradeDate = new Date(trade.timestamp)
        if (tradeDate.getFullYear() === currentYear) {
          const month = tradeDate.getMonth()
          if (month === currentMonth) tradeThisMonth++
          else if (month === currentMonth - 1) tradeLastMonth++
        }
      })

      // Combine activities from transactions and trades
      const allActivities = []

      // Add transactions (only show completed ones)
      txData.slice(0, 10).forEach((tx) => {
        allActivities.push({
          id: `tx-${tx.id}`,
          user: userLookup[tx.user_id] || "Unknown",
          action: `${tx.type} (${tx.status})`,
          amount: tx.amount ? `${tx.amount.toLocaleString()} 🪙` : null,
          timestamp: new Date(tx.created_at).toLocaleString(),
          created_at: tx.created_at,
          type: 'transaction'
        })
      })

      // Add trades
      tradesData.slice(0, 10).forEach((trade) => {
        allActivities.push({
          id: `trade-${trade.trade_id}`,
          user: userLookup[trade.user_id] || "Unknown",
          action: `${trade.action} ${trade.instrument_key}`,
          amount: trade.quantity ? `${trade.quantity} units` : null,
          timestamp: new Date(trade.timestamp).toLocaleString(),
          created_at: trade.timestamp,
          type: 'trade'
        })
      })

      // Sort all activities by timestamp and take top 5
      const recentActivities = allActivities
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      // Monthly activity distribution for graph (using trades data)
      const monthlySummary = Array(6).fill(null).map((_, i) => {
        const date = new Date()
        date.setMonth(currentMonth - (5 - i))
        const label = date.toLocaleString('default', { month: 'short' })
        const count = tradesData.filter(trade => {
          const tradeDate = new Date(trade.timestamp)
          return (
            tradeDate.getMonth() === date.getMonth() &&
            tradeDate.getFullYear() === date.getFullYear()
          )
        }).length
        return { month: label, users: count }
      })

      // Set final state
      setStats({
        totalUsers,
        deposits,
        withdrawals,
        tradeLastMonth,
        tradeThisMonth,
      })
      setActivities(recentActivities)
      setMonthlyActivity(monthlySummary)
    } catch (error) {
      console.error("Dashboard fetch error:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const calculatePercentageChange = () => {
    if (stats.tradeLastMonth === 0) {
      return stats.tradeThisMonth > 0 ? "100%" : "0%"
    }
    const change = ((stats.tradeThisMonth - stats.tradeLastMonth) / stats.tradeLastMonth) * 100
    return `${Math.round(change)}%`
  }

  const isPositiveChange = () => {
    return stats.tradeThisMonth >= stats.tradeLastMonth
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-gray-500">Monitor platform performance and user activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <div className="card-header flex justify-between pb-2">
            <h3 className="card-title text-sm font-medium">Total Users</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Registered accounts</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex justify-between pb-2">
            <h3 className="card-title text-sm font-medium">Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{stats.deposits.toLocaleString()} 🪙</div>
            <p className="text-xs text-gray-500">Total deposits</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex justify-between pb-2">
            <h3 className="card-title text-sm font-medium">Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{stats.withdrawals.toLocaleString()} 🪙</div>
            <p className="text-xs text-gray-500">Total withdrawals</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Trade Summary</h3>
            <p className="card-description">Trades made last month vs. this month</p>
          </div>
          <div className="card-content">
            <div className="flex items-center space-x-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Last Month</p>
                <div className="text-2xl font-bold">{stats.tradeLastMonth.toLocaleString()}</div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">This Month</p>
                <div className="text-2xl font-bold">{stats.tradeThisMonth.toLocaleString()}</div>
              </div>
              <div className="flex items-center space-x-2">
                {isPositiveChange() ? (
                  <ArrowUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${isPositiveChange() ? 'text-emerald-500' : 'text-red-500'}`}>
                  {calculatePercentageChange()}
                </span>
              </div>
            </div>

            <div className="mt-6 h-[200px] w-full bg-gray-100 rounded-md flex items-end justify-between px-2">
              {monthlyActivity.map((month, i) => {
                const maxHeight = Math.max(...monthlyActivity.map(m => m.users))
                const height = maxHeight > 0 ? (month.users / maxHeight) * 150 : 0
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-12 bg-blue-600 rounded-t-sm"
                      style={{ height: `${height}px`, minHeight: month.users > 0 ? '10px' : '0px' }}
                    ></div>
                    <span className="text-xs mt-2">{month.month}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activities</h3>
            <p className="card-description">Latest transactions and trades</p>
          </div>
          <div className="card-content">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <tr key={activity.id}>
                        <td className="font-medium">{activity.user}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activity.type === 'transaction' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {activity.type}
                          </span>
                          <div className="mt-1">
                            {activity.action}
                            {activity.amount && <span className="ml-1 text-gray-500">{activity.amount}</span>}
                          </div>
                        </td>
                        <td className="text-gray-500 text-sm">{activity.timestamp}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-gray-500 py-4">
                        No recent activities found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOverview