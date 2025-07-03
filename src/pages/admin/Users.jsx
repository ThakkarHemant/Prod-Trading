"use client"

import { useState } from "react"
import { Edit, Plus, Search, Trash, UserCheck, UserX } from "../../components/icons"
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/Select"

// Mock user data
const initialUsers = [
  {
    id: 1,
    userId: "user1",
    password: "user123",
    name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    status: "active",
    balance: 5000,
    createdAt: "2023-01-15",
  },
  {
    id: 2,
    userId: "user2",
    password: "user456",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "234-567-8901",
    status: "active",
    balance: 7500,
    createdAt: "2023-02-20",
  },
  {
    id: 3,
    userId: "user3",
    password: "user789",
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "345-678-9012",
    status: "inactive",
    balance: 2000,
    createdAt: "2023-03-10",
  },
  {
    id: 4,
    userId: "user4",
    password: "user101",
    name: "Sarah Williams",
    email: "sarah@example.com",
    phone: "456-789-0123",
    status: "active",
    balance: 10000,
    createdAt: "2023-04-05",
  },
  {
    id: 5,
    userId: "user5",
    password: "user202",
    name: "David Brown",
    email: "david@example.com",
    phone: "567-890-1234",
    status: "inactive",
    balance: 3500,
    createdAt: "2023-05-12",
  },
]

function AdminUsers() {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [newUser, setNewUser] = useState({
    userId: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    status: "active",
    balance: 0,
  })

  const activeUsers = users.filter((user) => user.status === "active")
  const inactiveUsers = users.filter((user) => user.status === "inactive")

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddUser = () => {
    const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1
    const today = new Date().toISOString().split("T")[0]

    setUsers([
      ...users,
      {
        ...newUser,
        id,
        createdAt: today,
      },
    ])

    setNewUser({
      userId: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      status: "active",
      balance: 0,
    })

    setIsAddUserOpen(false)
  }

  const handleEditUser = () => {
    if (!currentUser) return

    setUsers(users.map((user) => (user.id === currentUser.id ? currentUser : user)))

    setIsEditUserOpen(false)
  }

  const handleDeleteUser = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((user) => user.id !== id))
    }
  }

  const handleStatusChange = (id, status) => {
    setUsers(users.map((user) => (user.id === id ? { ...user, status } : user)))
  }

  const openEditDialog = (user) => {
    setCurrentUser(user)
    setIsEditUserOpen(true)
  }

  function UserTable({ users, onEdit, onDelete, onStatusChange }) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Created Date</th>
              <th>User Name</th>
              <th>Number</th>
              <th>Email</th>
              <th>Login ID</th>
              <th>Password</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td>{user.createdAt}</td>
                  <td className="font-medium">{user.name}</td>
                  <td>{user.phone}</td>
                  <td>{user.email}</td>
                  <td>{user.userId}</td>
                  <td>••••••••</td>
                  <td>
                    <Select value={user.status} onValueChange={(value) => onStatusChange(user.id, value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <span className="flex items-center">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                            Active
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <span className="flex items-center">
                            <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                            Inactive
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td>${user.balance.toLocaleString()}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => onEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onDelete(user.id)}>
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-gray-500">Manage platform users and their accounts</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <button className="btn btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account with the following details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="label text-right">
                  Name
                </label>
                <input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="phone" className="label text-right">
                  Phone
                </label>
                <input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="label text-right">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="userId" className="label text-right">
                  User ID
                </label>
                <input
                  id="userId"
                  value={newUser.userId}
                  onChange={(e) => setNewUser({ ...newUser, userId: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="password" className="label text-right">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="label text-right">
                  Status
                </label>
                <Select value={newUser.status} onValueChange={(value) => setNewUser({ ...newUser, status: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="balance" className="label text-right">
                  Balance
                </label>
                <input
                  id="balance"
                  type="number"
                  value={newUser.balance.toString()}
                  onChange={(e) => setNewUser({ ...newUser, balance: Number.parseFloat(e.target.value) || 0 })}
                  className="input col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <button type="button" className="btn btn-primary" onClick={handleAddUser}>
                Save User
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Users</h3>
            <UserCheck className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-gray-500">Registered accounts</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Active Users</h3>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-xs text-gray-500">
              {Math.round((activeUsers.length / users.length) * 100)}% of total users
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Inactive Users</h3>
            <UserX className="h-4 w-4 text-red-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">{inactiveUsers.length}</div>
            <p className="text-xs text-gray-500">
              {Math.round((inactiveUsers.length / users.length) * 100)}% of total users
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search users by name, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input max-w-sm"
          />
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <UserTable
              users={filteredUsers}
              onEdit={openEditDialog}
              onDelete={handleDeleteUser}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>
          <TabsContent value="active">
            <UserTable
              users={filteredUsers.filter((user) => user.status === "active")}
              onEdit={openEditDialog}
              onDelete={handleDeleteUser}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>
          <TabsContent value="inactive">
            <UserTable
              users={filteredUsers.filter((user) => user.status === "inactive")}
              onEdit={openEditDialog}
              onDelete={handleDeleteUser}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details.</DialogDescription>
          </DialogHeader>
          {currentUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-name" className="label text-right">
                  Name
                </label>
                <input
                  id="edit-name"
                  value={currentUser.name}
                  onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-phone" className="label text-right">
                  Phone
                </label>
                <input
                  id="edit-phone"
                  value={currentUser.phone}
                  onChange={(e) => setCurrentUser({ ...currentUser, phone: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-email" className="label text-right">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={currentUser.email}
                  onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-userId" className="label text-right">
                  User ID
                </label>
                <input
                  id="edit-userId"
                  value={currentUser.userId}
                  onChange={(e) => setCurrentUser({ ...currentUser, userId: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-password" className="label text-right">
                  Password
                </label>
                <input
                  id="edit-password"
                  type="password"
                  value={currentUser.password}
                  onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                  className="input col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-status" className="label text-right">
                  Status
                </label>
                <Select
                  value={currentUser.status}
                  onValueChange={(value) => setCurrentUser({ ...currentUser, status: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-balance" className="label text-right">
                  Balance
                </label>
                <input
                  id="edit-balance"
                  type="number"
                  value={currentUser.balance.toString()}
                  onChange={(e) => setCurrentUser({ ...currentUser, balance: Number.parseFloat(e.target.value) || 0 })}
                  className="input col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn btn-primary" onClick={handleEditUser}>
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminUsers
