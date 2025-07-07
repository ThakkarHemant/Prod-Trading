
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../../utils/supabase"
import { Edit, Plus, Search, Trash } from "../../components/icons"
import bcrypt from 'bcryptjs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog"

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  if (hash.length !== 60) throw new Error("Generated hash is not 60 characters long.");
  return hash;
}

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [newUser, setNewUser] = useState({
    id: "",
    username: "",
    coins: 0,
    password: ""
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin') // Exclude admin users
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddUser = async () => {
    if (!newUser.id || !newUser.username || !newUser.password) {
      alert("ID, Username and Password are required")
      return
    }

    if (newUser.password.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', newUser.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') throw checkError
      if (existingUser) {
        alert('User with this ID already exists')
        return
      }

      const hashedPassword = await hashPassword(newUser.password)

      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: newUser.id,
          username: newUser.username,
          coins: newUser.coins,
          password_hash: hashedPassword,
          role: 'user'
        }])
        .select()

      if (error) throw error

      setUsers([data[0], ...users])
      setNewUser({
        id: "",
        username: "",
        coins: 0,
        password: ""
      })
      setIsAddUserOpen(false)
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Failed to add user: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          username: currentUser.username,
          coins: currentUser.coins
        })
        .eq('id', currentUser.id)
        .select()

      if (error) throw error

      setUsers(users.map(user => user.id === currentUser.id ? data[0] : user))
      setIsEditUserOpen(false)
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      setUsers(users.filter(user => user.id !== id))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage platform users and their accounts</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] w-full max-w-sm rounded-2xl shadow-xl px-6 py-6">
  <DialogHeader>
    <DialogTitle className="text-2xl font-semibold text-gray-800">Add New User</DialogTitle>
    <DialogDescription className="text-sm text-gray-500">
      Create a new user account with the following details.
    </DialogDescription>
  </DialogHeader>

  <div className="space-y-5 pt-4">
    {/* User ID */}
    <div className="space-y-1">
      <label htmlFor="id" className="block text-sm font-medium text-gray-700">
        User ID
      </label>
      <input
        id="id"
        value={newUser.id}
        onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
        className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter unique ID"
        required
      />
    </div>

    {/* Username */}
    <div className="space-y-1">
      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
        Username
      </label>
      <input
        id="username"
        value={newUser.username}
        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
        className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter username"
        required
      />
    </div>

    {/* Password */}
    <div className="space-y-1">
      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
        Password
      </label>
      <input
        id="password"
        type="password"
        value={newUser.password}
        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
        className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter password (min 6 chars)"
        required
        minLength={6}
      />
    </div>

    {/* Initial Coins */}
    <div className="space-y-1">
      <label htmlFor="coins" className="block text-sm font-medium text-gray-700">
        Initial Coins
      </label>
      <input
        id="coins"
        type="number"
        value={newUser.coins}
        onChange={(e) =>
          setNewUser({ ...newUser, coins: Number(e.target.value) || 0 })
        }
        className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        min="0"
      />
    </div>
  </div>

  <DialogFooter className="pt-6">
    <button
      type="button"
      onClick={handleAddUser}
      className="w-full max-w-[340px] mx-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md shadow-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      disabled={
        isLoading ||
        !newUser.id ||
        !newUser.username ||
        !newUser.password ||
        newUser.password.length < 6
      }
    >
      {isLoading ? "Creating..." : "Save User"}
    </button>
  </DialogFooter>
            </DialogContent>

        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            placeholder="Search users by ID or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    {isLoading ? "Loading..." : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.coins}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => {
                            setCurrentUser(user)
                            setIsEditUserOpen(true)
                          }}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[420px] w-full max-w-sm rounded-2xl shadow-xl px-6 py-6">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details.</DialogDescription>
          </DialogHeader>
          {currentUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-id" className="label text-right">
                  User ID
                </label>
                <input
                  id="edit-id"
                  value={currentUser.id}
                  readOnly
                  className="input col-span-3 bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-username" className="label text-right">
                  Username
                </label>
                <input
                  id="edit-username"
                  value={currentUser.username}
                  onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                  className="input col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-coins" className="label text-right">
                  Coins
                </label>
                <input
                  id="edit-coins"
                  type="number"
                  value={currentUser.coins}
                  onChange={(e) => setCurrentUser({ ...currentUser, coins: Number(e.target.value) || 0 })}
                  className="input col-span-3"
                  min="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleEditUser}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminUsers