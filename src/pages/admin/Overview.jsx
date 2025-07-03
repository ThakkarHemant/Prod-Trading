"use client"

import { useState } from "react"
import { Activity, ArrowDown, ArrowUp, Users } from "../../components/icons"

// Mock data
const mockStats = {
  totalUsers: 1245,
  activeUsers: 987,
  deposits: 125000,
  withdrawals: 78500,
  tradeLastMonth: 456,
  tradeThisMonth: 523,
}

const mockActivities = [
  { id: 1, user: "John Doe", action: "Login", timestamp: "2023-04-20 09:15:23" },
  { id: 2, user: "Jane Smith", action: "Deposit", amount: "$1,000", timestamp: "2023-04-20 10:30:45" },
  { id: 3, user: "Mike Johnson", action: "Withdrawal", amount: "$500", timestamp: "2023-04-20 11:45:12" },
  { id: 4, user: "Sarah Williams", action: "Trade", details: "Bought AAPL x10", timestamp: "2023-04-20 13:20:33" },
  { id: 5, user: "David Brown", action: "Login", timestamp: "2023-04-20 14:05:18" },
  { id: 6, user: "Emily Davis", action: "Deposit", amount: "$2,500", timestamp: "2023-04-20 15:10:27" },
  { id: 7, user: "Robert Wilson", action: "Trade", details: "Sold TSLA x5", timestamp: "2023-04-20 16:30:42" },
]

const monthlyActivity = [
  { month: "Jan", users: 850 },
  { month: "Feb", users: 940 },
  { month: "Mar", users: 1020 },
  { month: "Apr", users: 980 },
  { month: "May", users: 1150 },
  { month: "Jun", users: 1250 },
]

function AdminOverview() {
  const [stats] = useState(mockStats)
  const [activities] = useState(mockActivities)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-gray-500">Monitor platform performance and user activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Users</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Registered accounts</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Active Accounts</h3>
            <Activity className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">
              {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total users
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Deposits (Live)</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${stats.deposits.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Current month</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Withdrawals (Live)</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${stats.withdrawals.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Current month</p>
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
                <ArrowUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">
                  {Math.round(((stats.tradeThisMonth - stats.tradeLastMonth) / stats.tradeLastMonth) * 100)}%
                </span>
              </div>
            </div>
            <div className="mt-6 h-[200px] w-full bg-gray-100 rounded-md flex items-end justify-between px-2">
              {monthlyActivity.map((month, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-12 bg-blue-600 rounded-t-sm"
                    style={{ height: `${(month.users / 1250) * 150}px` }}
                  ></div>
                  <span className="text-xs mt-2">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activities</h3>
            <p className="card-description">Latest user actions on the platform</p>
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
                  {activities.slice(0, 5).map((activity) => (
                    <tr key={activity.id}>
                      <td className="font-medium">{activity.user}</td>
                      <td>
                        {activity.action}
                        {activity.amount && <span className="ml-1 text-gray-500">{activity.amount}</span>}
                        {activity.details && <span className="ml-1 text-gray-500">{activity.details}</span>}
                      </td>
                      <td className="text-gray-500">{activity.timestamp}</td>
                    </tr>
                  ))}
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
