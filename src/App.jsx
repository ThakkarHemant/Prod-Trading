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
import UserSettings from "./pages/user/Settings.jsx";
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
                <h1 className="text-xl font-bold text-gray-800">Zerodha Trading Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900">Home</Link>
                <Link to="/watchlist" className="text-gray-600 hover:text-gray-900">Live Watchlist</Link>
              </div>
            </div>
          </div>
        </nav>

<Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
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
            <Route path="settings" element={<UserSettings />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  const buttonClass =
    "bg-blue-500 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-600 transition";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Zerodha Trading Dashboard
        </h2>
        <p className="text-gray-600">Real-time market data and trading interface</p>
      </div>

<div className="flex justify-center items-center py-12">
  <div className="flex gap-4 p-6 bg-white rounded-xl shadow-lg">
    <Link
      to="/watchlist"
      className="min-w-[120px] px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium text-center hover:bg-blue-700 transition-all duration-200"
    >
      Live Watchlist
    </Link>
    <Link
      to="/login"
      className="min-w-[120px] px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium text-center hover:bg-blue-700 transition-all duration-200"
    >
      Login
    </Link>
    <Link
      to="/zerodha-callback"
      className="min-w-[120px] px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium text-center hover:bg-blue-700 transition-all duration-200"
    >
      Callback
    </Link>
  </div>
</div>




    </div>
  );
}

export default App;
