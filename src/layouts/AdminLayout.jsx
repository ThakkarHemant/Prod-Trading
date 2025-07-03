import { Outlet } from "react-router-dom"
import DashboardLayout from "./DashboardLayout"

function AdminLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}

export default AdminLayout
