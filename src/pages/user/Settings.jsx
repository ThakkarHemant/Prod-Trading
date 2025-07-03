"use client"

import { useEffect, useState } from "react"
import { User } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"

function UserSettings() {
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      })
    }
  }, [])

  const handleProfileUpdate = (e) => {
    e.preventDefault()

    // Update user data in localStorage
    if (user) {
      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      }

      localStorage.setItem("currentUser", JSON.stringify(updatedUser))
      setUser(updatedUser)

      alert("Profile updated successfully")
    }
  }

  const handlePasswordUpdate = (e) => {
    e.preventDefault()

    // Validate password
    if (passwordData.currentPassword !== user?.password) {
      alert("Current password is incorrect")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    // Update password in localStorage
    if (user) {
      const updatedUser = {
        ...user,
        password: passwordData.newPassword,
      }

      localStorage.setItem("currentUser", JSON.stringify(updatedUser))
      setUser(updatedUser)

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      alert("Password updated successfully")
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Profile Information</h3>
              <p className="card-description">Update your account profile information</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="h-12 w-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="label">
                    Name
                  </label>
                  <input
                    id="name"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="label">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Update Profile
                </button>
              </form>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="password" className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Change Password</h3>
              <p className="card-description">Update your account password</p>
            </div>
            <div className="card-content">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="label">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="input"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="label">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="input"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="label">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="input"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UserSettings
