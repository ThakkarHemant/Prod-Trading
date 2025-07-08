/*
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../../utils/supabase"
import { Plus, Trash } from "../../components/icons"
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

function AdminSettings() {
  const [users, setUsers] = useState([]);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    id: "",
    username: "",
    role: "admin",
    password: "",
    coins: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.id || !newAdmin.password || !newAdmin.username.trim()) {
      alert("All fields are required");
      return;
    }

    if (newAdmin.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const hashedPassword = await hashPassword(newAdmin.password);

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', newAdmin.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        throw checkError;
      }

      if (existingUser) {
        alert('User with this ID already exists');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: newAdmin.id,
          username: newAdmin.username,
          role: newAdmin.role,
          password_hash: hashedPassword,
          coins: parseFloat(newAdmin.coins) || 0,
        }])
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      setUsers([...users, data[0]]);
      setNewAdmin({ id: "", username: "", role: "admin", password: "", coins: 0 });
      setIsAddAdminOpen(false);
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Failed to add admin: ' + (error?.message || JSON.stringify(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (users.length <= 1) {
      alert("Cannot delete the last admin account");
      return;
    }

    if (!confirm("Are you sure you want to delete this admin?")) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(users.filter((user) => user.id !== id));
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete admin: ' + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Management</h1>
          <p className="text-gray-600">Manage administrator accounts</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold">Admin Accounts</h2>
            <p className="text-sm text-gray-500">{users.length} admin accounts</p>
          </div>

          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] w-full max-w-sm rounded-2xl shadow-xl px-6 py-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-gray-800">
                  New Admin Account
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Enter admin details to create an account
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-4">
                {/* Full Name }
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                {/* ID }
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">ID *</label>
                  <input
                    value={newAdmin.id}
                    onChange={(e) => setNewAdmin({ ...newAdmin, id: e.target.value })}
                    className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter unique ID"
                    required
                  />
                </div>

                {/* Password }
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Password *</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password (min 6 chars)"
                    required
                    minLength="6"
                  />
                </div>

                {/* Coins }
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Initial Coins</label>
                  <input
                    type="number"
                    value={newAdmin.coins}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, coins: Number(e.target.value) || 0 })
                    }
                    className="w-full max-w-[340px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <DialogFooter className="pt-6">
                <button
                  onClick={handleAddAdmin}
                  className="w-full max-w-[340px] mx-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md shadow-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={
                    isLoading || !newAdmin.id || !newAdmin.password || !newAdmin.username.trim() || newAdmin.password.length < 6
                  }
                >
                  {isLoading ? "Creating..." : "Create Admin"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && users.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.coins}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteAdmin(user.id)}
                        disabled={users.length <= 1 || isLoading}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSettings;
*/

"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../../utils/supabase"
import { Plus, Trash } from "../../components/icons"
import bcrypt from "bcryptjs"
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
  const saltRounds = 10
  const hash = await bcrypt.hash(password, saltRounds)
  if (hash.length !== 60) throw new Error("Generated hash is not 60 characters long.")
  return hash
}

function AdminSettings() {
  const [users, setUsers] = useState([])
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    id: "",
    username: "",
    role: "admin",
    password: "",
    coins: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("users").select("*").eq("role", "admin")

    if (error) {
      console.error("Error fetching users:", error)
    } else {
      setUsers(data || [])
    }
    setIsLoading(false)
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.id || !newAdmin.password || !newAdmin.username.trim()) {
      alert("All fields are required")
      return
    }

    if (newAdmin.password.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)
    try {
      const hashedPassword = await hashPassword(newAdmin.password)

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", newAdmin.id)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing user:", checkError)
        throw checkError
      }

      if (existingUser) {
        alert("User with this ID already exists")
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            id: newAdmin.id,
            username: newAdmin.username,
            role: newAdmin.role,
            password_hash: hashedPassword,
            coins: Number.parseFloat(newAdmin.coins) || 0,
          },
        ])
        .select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      setUsers([...users, data[0]])
      setNewAdmin({ id: "", username: "", role: "admin", password: "", coins: 0 })
      setIsAddAdminOpen(false)
    } catch (error) {
      console.error("Error adding admin:", error)
      alert("Failed to add admin: " + (error?.message || JSON.stringify(error)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAdmin = async (id) => {
    if (users.length <= 1) {
      alert("Cannot delete the last admin account")
      return
    }

    if (!confirm("Are you sure you want to delete this admin?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("users").delete().eq("id", id)

      if (error) throw error

      setUsers(users.filter((user) => user.id !== id))
    } catch (error) {
      console.error("Error deleting admin:", error)
      alert("Failed to delete admin: " + (error?.message || error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Admin Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage administrator accounts</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Admin Accounts</h2>
            <p className="text-xs sm:text-sm text-gray-500">{users.length} admin accounts</p>
          </div>

          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md flex items-center justify-center text-sm sm:text-base w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto rounded-lg shadow-xl p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-2xl font-semibold text-gray-800">New Admin Account</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-500">
                  Enter admin details to create an account
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-5 pt-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                {/* ID */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">ID *</label>
                  <input
                    value={newAdmin.id}
                    onChange={(e) => setNewAdmin({ ...newAdmin, id: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="Enter unique ID"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Password *</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="Enter password (min 6 chars)"
                    required
                    minLength="6"
                  />
                </div>

                {/* Coins */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Initial Coins</label>
                  <input
                    type="number"
                    value={newAdmin.coins}
                    onChange={(e) => setNewAdmin({ ...newAdmin, coins: Number(e.target.value) || 0 })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    min="0"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 sm:pt-6">
                <button
                  onClick={handleAddAdmin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 sm:py-3 rounded-md shadow-md transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                  disabled={
                    isLoading ||
                    !newAdmin.id ||
                    !newAdmin.password ||
                    !newAdmin.username.trim() ||
                    newAdmin.password.length < 6
                  }
                >
                  {isLoading ? "Creating..." : "Create Admin"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading State */}
        {isLoading && users.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coins
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.username || "—"}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.coins}</td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteAdmin(user.id)}
                          disabled={users.length <= 1 || isLoading}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {users.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{user.username || "—"}</h3>
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAdmin(user.id)}
                      disabled={users.length <= 1 || isLoading}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed p-1 ml-2 flex-shrink-0"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Role:</span>
                      <p className="font-medium">{user.role}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Coins:</span>
                      <p className="font-medium">{user.coins}</p>
                    </div>
                  </div>

                  {user.created_at && (
                    <div className="text-xs">
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No admin accounts found</p>
                </div>
              )}
            </div>

            {/* Tablet Horizontal Scroll Table */}
            <div className="hidden sm:block lg:hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coins
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{user.username || "—"}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{user.coins}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteAdmin(user.id)}
                          disabled={users.length <= 1 || isLoading}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminSettings

