import { Outlet } from "react-router-dom"
import DashboardLayout from "./DashboardLayout"

function UserLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}

export default UserLayout
