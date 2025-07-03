"use client"

import { useState } from "react"
import { Plus, Trash } from "../../components/icons"
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

// Mock admin data
const initialAdmins = [
  {
    id: 1,
    userId: "admin1",
    password: "admin123",
    name: "Admin User",
    email: "admin@example.com",
    phone: "123-456-7890",
  },
  {
    id: 2,
    userId: "admin2",
    password: "admin456",
    name: "Super Admin",
    email: "super@example.com",
    phone: "234-567-8901",
  },
]

function AdminSettings() {
  const [admins, setAdmins] = useState(initialAdmins)
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    userId: "",
    password: "",
    name: "",
    email: "",
    phone: "",
  })

  const handleAddAdmin = () => {
    const id = admins.length > 0 ? Math.max(...admins.map((a) => a.id)) + 1 : 1

    setAdmins([
      ...admins,
      {
        ...newAdmin,
        id,
      },
    ])

    setNewAdmin({
      userId: "",
      password: "",
      name: "",
      email: "",
      phone: "",
    })

    setIsAddAdminOpen(false)
  }

  const handleDeleteAdmin = (id) => {
    if (admins.length <= 1) {
      alert("Cannot delete the last admin account")
      return
    }

    if (confirm("Are you sure you want to delete this admin?")) {
      setAdmins(admins.filter((admin) => admin.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500">Manage admin accounts and platform settings</p>
        </div>
      </div>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList>
          <TabsTrigger value="admins">Admin Management</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="admins" className="space-y-4">
          <div className="card">
            <div className="card-header flex flex-row items-center justify-between">
              <div>
                <h3 className="card-title">Admin Accounts</h3>
                <p className="card-description">Manage administrator accounts for the platform</p>
              </div>
              <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                <DialogTrigger asChild>
                  <button className="btn btn-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Admin
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Admin</DialogTitle>
                    <DialogDescription>
                      Create a new administrator account with the following details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="name" className="label text-right">
                        Name
                      </label>
                      <input
                        id="name"
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                        className="input col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="phone" className="label text-right">
                        Phone
                      </label>
                      <input
                        id="phone"
                        value={newAdmin.phone}
                        onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
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
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                        className="input col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="userId" className="label text-right">
                        User ID
                      </label>
                      <input
                        id="userId"
                        value={newAdmin.userId}
                        onChange={(e) => setNewAdmin({ ...newAdmin, userId: e.target.value })}
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
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        className="input col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <button type="button" className="btn btn-primary" onClick={handleAddAdmin}>
                      Add Admin
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="card-content">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>User ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="font-medium">{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>{admin.phone}</td>
                        <td>{admin.userId}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteAdmin(admin.id)}
                            disabled={admins.length <= 1}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Security Settings</h3>
              <p className="card-description">Manage security settings for your account</p>
            </div>
            <div className="card-content space-y-4">
              <div className="space-y-2">
                <label htmlFor="current-password" className="label">
                  Current Password
                </label>
                <input id="current-password" type="password" className="input" />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-password" className="label">
                  New Password
                </label>
                <input id="new-password" type="password" className="input" />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="label">
                  Confirm New Password
                </label>
                <input id="confirm-password" type="password" className="input" />
              </div>
              <button className="btn btn-primary">Update Password</button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminSettings
