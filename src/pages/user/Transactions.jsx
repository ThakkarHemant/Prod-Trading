"use client"

import { useState } from "react"
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

// Mock transaction data
const transactions = [
  {
    id: 1,
    type: "DEPOSIT",
    amount: 5000,
    status: "COMPLETE",
    date: "2023-04-15 10:30:45",
  },
  {
    id: 2,
    type: "WITHDRAW",
    amount: 2000,
    status: "COMPLETE",
    date: "2023-04-16 09:45:12",
  },
  {
    id: 3,
    type: "DEPOSIT",
    amount: 3000,
    status: "PENDING",
    date: "2023-04-18 13:15:30",
  },
  {
    id: 4,
    type: "WITHDRAW",
    amount: 1500,
    status: "COMPLETE",
    date: "2023-04-17 10:20:15",
  },
  {
    id: 5,
    type: "DEPOSIT",
    amount: 7500,
    status: "COMPLETE",
    date: "2023-04-19 11:30:45",
  },
]

function UserTransactions() {
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [transactionList, setTransactionList] = useState(transactions)

  const deposits = transactionList.filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETE")
  const withdrawals = transactionList.filter((t) => t.type === "WITHDRAW" && t.status === "COMPLETE")
  const pendingTransactions = transactionList.filter((t) => t.status === "PENDING")

  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0)
  const balance = totalDeposits - totalWithdrawals

  const handleDeposit = () => {
    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    const id = Math.max(...transactionList.map((t) => t.id)) + 1
    const now = new Date().toISOString().replace("T", " ").substring(0, 19)

    setTransactionList([
      ...transactionList,
      {
        id,
        type: "DEPOSIT",
        amount: Number.parseFloat(amount),
        status: "PENDING",
        date: now,
      },
    ])

    setAmount("")
    setIsDepositOpen(false)
  }

  const handleWithdraw = () => {
    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (Number.parseFloat(amount) > balance) {
      alert("Insufficient balance")
      return
    }

    const id = Math.max(...transactionList.map((t) => t.id)) + 1
    const now = new Date().toISOString().replace("T", " ").substring(0, 19)

    setTransactionList([
      ...transactionList,
      {
        id,
        type: "WITHDRAW",
        amount: Number.parseFloat(amount),
        status: "PENDING",
        date: now,
      },
    ])

    setAmount("")
    setIsWithdrawOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deposit/Withdraw</h1>
          <p className="text-gray-500">Manage your account balance</p>
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
                <DialogTitle>Deposit Funds</DialogTitle>
                <DialogDescription>Add funds to your trading account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="amount" className="label text-right">
                    Amount
                  </label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
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
                  Deposit
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
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>Withdraw funds from your trading account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="withdraw-amount" className="label text-right">
                    Amount
                  </label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
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
                  Available Balance: ${balance.toFixed(2)}
                </div>
              </div>
              <DialogFooter>
                <button type="button" className="btn btn-primary" onClick={handleWithdraw}>
                  Withdraw
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
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Available for trading</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Deposits</h3>
            <ArrowUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Completed deposits</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Withdrawals</h3>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalWithdrawals.toFixed(2)}</div>
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
                <p className="card-description">All your deposit and withdrawal transactions</p>
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
                      {transactionList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactionList.map((transaction) => (
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
                            <td>${transaction.amount.toFixed(2)}</td>
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
                            <td>{transaction.date}</td>
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
                      {transactionList.filter((t) => t.type === "DEPOSIT").length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No deposits found
                          </td>
                        </tr>
                      ) : (
                        transactionList
                          .filter((t) => t.type === "DEPOSIT")
                          .map((transaction) => (
                            <tr key={transaction.id}>
                              <td>#{transaction.id}</td>
                              <td>${transaction.amount.toFixed(2)}</td>
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
                              <td>{transaction.date}</td>
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
                      {transactionList.filter((t) => t.type === "WITHDRAW").length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No withdrawals found
                          </td>
                        </tr>
                      ) : (
                        transactionList
                          .filter((t) => t.type === "WITHDRAW")
                          .map((transaction) => (
                            <tr key={transaction.id}>
                              <td>#{transaction.id}</td>
                              <td>${transaction.amount.toFixed(2)}</td>
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
                              <td>{transaction.date}</td>
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
                      {transactionList.filter((t) => t.status === "PENDING").length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center">
                            No pending transactions
                          </td>
                        </tr>
                      ) : (
                        transactionList
                          .filter((t) => t.status === "PENDING")
                          .map((transaction) => (
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
                              <td>${transaction.amount.toFixed(2)}</td>
                              <td>{transaction.date}</td>
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

export default UserTransactions
