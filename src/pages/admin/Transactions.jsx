"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Search } from "../../components/icons"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"

// Mock transaction data
const transactions = [
  {
    id: 1,
    userId: "user1",
    userName: "John Doe",
    type: "DEPOSIT",
    amount: 5000,
    status: "COMPLETE",
    date: "2023-04-15 10:30:45",
  },
  {
    id: 2,
    userId: "user2",
    userName: "Jane Smith",
    type: "WITHDRAW",
    amount: 2000,
    status: "COMPLETE",
    date: "2023-04-16 09:45:12",
  },
  {
    id: 3,
    userId: "user1",
    userName: "John Doe",
    type: "DEPOSIT",
    amount: 3000,
    status: "PENDING",
    date: "2023-04-18 13:15:30",
  },
  {
    id: 4,
    userId: "user3",
    userName: "Mike Johnson",
    type: "WITHDRAW",
    amount: 1500,
    status: "COMPLETE",
    date: "2023-04-17 10:20:15",
  },
  {
    id: 5,
    userId: "user2",
    userName: "Jane Smith",
    type: "DEPOSIT",
    amount: 7500,
    status: "COMPLETE",
    date: "2023-04-19 11:30:45",
  },
  {
    id: 6,
    userId: "user4",
    userName: "Sarah Williams",
    type: "WITHDRAW",
    amount: 3500,
    status: "PENDING",
    date: "2023-04-20 14:25:10",
  },
  {
    id: 7,
    userId: "user3",
    userName: "Mike Johnson",
    type: "DEPOSIT",
    amount: 2500,
    status: "COMPLETE",
    date: "2023-04-21 09:15:30",
  },
  {
    id: 8,
    userId: "user1",
    userName: "John Doe",
    type: "WITHDRAW",
    amount: 1000,
    status: "CANCELLED",
    date: "2023-04-22 16:40:20",
  },
]

function AdminTransactions() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.userId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || transaction.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesType = typeFilter === "all" || transaction.type.toLowerCase() === typeFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesType
  })

  const deposits = transactions.filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETE")
  const withdrawals = transactions.filter((t) => t.type === "WITHDRAW" && t.status === "COMPLETE")
  const pendingTransactions = transactions.filter((t) => t.status === "PENDING")

  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0)
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

  const handleStatusChange = (id, status) => {
    // In a real app, this would update the database
    console.log(`Transaction ${id} status changed to ${status}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deposit/Withdraw Management</h1>
        <p className="text-gray-500">Monitor and manage user transactions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalDeposits.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalWithdrawals.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">${pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-gray-500">In pending transactions</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search by user..."
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
                <th>Serial No.</th>
                <th>User ID</th>
                <th>User Name</th>
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
                  <td colSpan={8} className="text-center">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id}>
                    <td>{index + 1}</td>
                    <td>{transaction.userId}</td>
                    <td className="font-medium">{transaction.userName}</td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === "DEPOSIT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td>${transaction.amount.toLocaleString()}</td>
                    <td>
                      <Select
                        value={transaction.status.toLowerCase()}
                        onValueChange={(value) => handleStatusChange(transaction.id, value)}
                        disabled={transaction.status === "COMPLETE"}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complete">
                            <span className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                              Complete
                            </span>
                          </SelectItem>
                          <SelectItem value="pending">
                            <span className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
                              Pending
                            </span>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <span className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                              Cancelled
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td>{transaction.date}</td>
                    <td>
                      {transaction.status === "PENDING" && (
                        <div className="flex space-x-2">
                          <button
                            className="btn btn-outline btn-sm h-8 text-xs"
                            onClick={() => handleStatusChange(transaction.id, "complete")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline btn-sm h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleStatusChange(transaction.id, "cancelled")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminTransactions
