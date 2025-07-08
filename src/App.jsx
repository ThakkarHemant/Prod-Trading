import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LiveWatchlist from "./components/LiveWatchlist";
import ZerodhaCallback from './components/ZerodhaCallback';
import LoginPage from "./pages/Login/index.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import UserLayout from "./layouts/UserLayout.jsx";
import AdminOverview from "./pages/admin/Overview.jsx";
import AdminWatchlist from "./pages/admin/Watchlist.jsx";
import AdminTrades from "./pages/admin/Trades.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import AdminTransactions from "./pages/admin/Transactions.jsx";
import AdminSettings from "./pages/admin/Settings.jsx";
import UserWatchlist from "./pages/user/Watchlist.jsx";
import UserPortfolio from "./pages/user/Portfolio.jsx";
//import UserSettings from "./pages/user/Settings.jsx";
import UserTrades from "./pages/user/Trades.jsx";
import UserTransactions from "./pages/user/Transactions.jsx";
import  supabase  from "../utils/supabase.js";


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-800">Trading Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              </div>
            </div>
          </div>
        </nav>

<Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/watchlist" element={<LiveWatchlist />} />
          <Route path="/zerodha-callback" element={<ZerodhaCallback />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="overview" element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="watchlist" element={<AdminWatchlist />} />
            <Route path="trades" element={<AdminTrades />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* User Routes */}
          <Route path="/user" element={<UserLayout />}>
            <Route path="watchlist" element={<UserWatchlist />} />
            <Route path="portfolio" element={<UserPortfolio />} />
            <Route path="trades" element={<UserTrades />} />
            <Route path="transactions" element={<UserTransactions />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}



export default App;
