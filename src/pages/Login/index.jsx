
"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "../../components/icons"
import { supabase } from "../../../utils/supabase.js"
import bcrypt from "bcryptjs"

function LoginPage() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    console.log("[Login Attempt] userId:", userId)

    try {
      const { data: user, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (supabaseError) {
        console.error("[Supabase Error]", supabaseError.message)
        setError("Something went wrong while contacting the server.")
        setLoading(false)
        return
      }

      if (!user) {
        console.warn("[Auth Failed] User not found")
        setError("Invalid user ID or password")
        setLoading(false)
        return
      }

      console.log("[User Fetched]", user)

      const isValid = await bcrypt.compare(password, user.password_hash)
      console.log("[Password Match]:", isValid)

      if (!isValid) {
        setError("Invalid user ID or password")
        setLoading(false)
        return
      }

      // Store user data in localStorage (or use context)
      localStorage.setItem("currentUser", JSON.stringify(user))
      localStorage.setItem("id", user.id)
      localStorage.setItem("name", user.username)
      console.log("[Login Success] Redirecting...")

      if (user.role === "admin") {
        navigate("/admin/overview")
      } else {
        navigate("/user/watchlist")
      }

    } catch (err) {
      console.error("[Login Error]", err)
      setError("Unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-md border border-gray-200 shadow-md bg-white rounded-xl">
        <div className="card-header p-6">
          <h2 className="text-2xl font-bold text-center">Trading Platform</h2>
          <p className="text-center text-gray-500">Enter your credentials to sign in</p>
        </div>
        <div className="card-content px-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block mb-1 text-sm font-medium">User ID</label>
              <input
                id="userId"
                className="input w-full border px-3 py-2 rounded-md"
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1 text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input w-full border px-3 py-2 rounded-md"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
        <div className="card-footer text-xs text-gray-500 text-center p-4">
          Demo Credentials: admin1 / admin123 or user1 / user123
        </div>
      </div>
    </div>
  )
}

export default LoginPage
