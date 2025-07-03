import { ArrowDown, ArrowUp, LineChart, PieChart } from "../../components/icons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"

// Mock portfolio data
const portfolioStocks = [
  {
    id: 1,
    symbol: "RELIANCE",
    name: "Reliance Industries",
    quantity: 10,
    avgPrice: 2550.75,
    currentPrice: 2567.8,
    value: 25678.0,
    pnl: 170.5,
    pnlPercentage: 0.67,
    type: "NSE",
  },
  {
    id: 2,
    symbol: "TCS",
    name: "Tata Consultancy Services",
    quantity: 5,
    avgPrice: 3470.25,
    currentPrice: 3456.7,
    value: 17283.5,
    pnl: -67.75,
    pnlPercentage: -0.39,
    type: "NSE",
  },
  {
    id: 3,
    symbol: "GOLD",
    name: "Gold",
    quantity: 2,
    avgPrice: 2330.5,
    currentPrice: 2345.67,
    value: 4691.34,
    pnl: 30.34,
    pnlPercentage: 0.65,
    type: "MCX",
  },
  {
    id: 4,
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    quantity: 8,
    avgPrice: 1670.25,
    currentPrice: 1678.9,
    value: 13431.2,
    pnl: 69.2,
    pnlPercentage: 0.52,
    type: "NSE",
  },
]

// Mock historical performance data
const historicalPerformance = [
  { month: "Jan", value: 50000 },
  { month: "Feb", value: 52000 },
  { month: "Mar", value: 48000 },
  { month: "Apr", value: 53000 },
  { month: "May", value: 57000 },
  { month: "Jun", value: 60000 },
]

function UserPortfolio() {
  const totalValue = portfolioStocks.reduce((sum, stock) => sum + stock.value, 0)
  const totalInvestment = portfolioStocks.reduce((sum, stock) => sum + stock.avgPrice * stock.quantity, 0)
  const totalPnL = portfolioStocks.reduce((sum, stock) => sum + stock.pnl, 0)
  const totalPnLPercentage = (totalPnL / totalInvestment) * 100

  const nseStocks = portfolioStocks.filter((stock) => stock.type === "NSE")
  const mcxStocks = portfolioStocks.filter((stock) => stock.type === "MCX")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-gray-500">Track your investments and performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Portfolio Value</h3>
            <PieChart className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Current market value</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total Investment</h3>
            <LineChart className="h-4 w-4 text-gray-500" />
          </div>
          <div className="card-content">
            <div className="text-2xl font-bold">${totalInvestment.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Cost basis</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Total P&L</h3>
            {totalPnL >= 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="card-content">
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Unrealized gain/loss</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="card-title text-sm font-medium">Return</h3>
            {totalPnLPercentage >= 0 ? (
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="card-content">
            <div className={`text-2xl font-bold ${totalPnLPercentage >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {totalPnLPercentage >= 0 ? "+" : ""}
              {Math.abs(totalPnLPercentage).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500">Overall performance</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Portfolio Summary</h3>
            <p className="card-description">Overview of your current holdings</p>
          </div>
          <div className="card-content">
            <div className="space-y-8">
              <div className="h-[200px] w-full bg-gray-100 rounded-md flex items-end justify-between px-2">
                {historicalPerformance.map((month, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-12 bg-blue-600 rounded-t-sm"
                      style={{ height: `${(month.value / 60000) * 150}px` }}
                    ></div>
                    <span className="text-xs mt-2">{month.month}</span>
                  </div>
                ))}
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Holdings</TabsTrigger>
                  <TabsTrigger value="nse">NSE</TabsTrigger>
                  <TabsTrigger value="mcx">MCX</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Avg. Price</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioStocks.map((stock) => (
                          <tr key={stock.id}>
                            <td className="font-medium">{stock.symbol}</td>
                            <td>{stock.name}</td>
                            <td>{stock.type}</td>
                            <td>{stock.quantity}</td>
                            <td>${stock.avgPrice.toFixed(2)}</td>
                            <td>${stock.currentPrice.toFixed(2)}</td>
                            <td>${stock.value.toFixed(2)}</td>
                            <td className={stock.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnl >= 0 ? "+" : ""}${stock.pnl.toFixed(2)}
                            </td>
                            <td className={stock.pnlPercentage >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnlPercentage >= 0 ? "+" : ""}
                              {stock.pnlPercentage.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="nse">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Name</th>
                          <th>Quantity</th>
                          <th>Avg. Price</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nseStocks.map((stock) => (
                          <tr key={stock.id}>
                            <td className="font-medium">{stock.symbol}</td>
                            <td>{stock.name}</td>
                            <td>{stock.quantity}</td>
                            <td>${stock.avgPrice.toFixed(2)}</td>
                            <td>${stock.currentPrice.toFixed(2)}</td>
                            <td>${stock.value.toFixed(2)}</td>
                            <td className={stock.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnl >= 0 ? "+" : ""}${stock.pnl.toFixed(2)}
                            </td>
                            <td className={stock.pnlPercentage >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnlPercentage >= 0 ? "+" : ""}
                              {stock.pnlPercentage.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="mcx">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Name</th>
                          <th>Quantity</th>
                          <th>Avg. Price</th>
                          <th>Current Price</th>
                          <th>Value</th>
                          <th>P&L</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mcxStocks.map((stock) => (
                          <tr key={stock.id}>
                            <td className="font-medium">{stock.symbol}</td>
                            <td>{stock.name}</td>
                            <td>{stock.quantity}</td>
                            <td>${stock.avgPrice.toFixed(2)}</td>
                            <td>${stock.currentPrice.toFixed(2)}</td>
                            <td>${stock.value.toFixed(2)}</td>
                            <td className={stock.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnl >= 0 ? "+" : ""}${stock.pnl.toFixed(2)}
                            </td>
                            <td className={stock.pnlPercentage >= 0 ? "text-emerald-500" : "text-red-500"}>
                              {stock.pnlPercentage >= 0 ? "+" : ""}
                              {stock.pnlPercentage.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserPortfolio
