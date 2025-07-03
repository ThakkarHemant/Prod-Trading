// services/zerodhaService.js
const KiteConnect = require("kiteconnect").KiteConnect;

class ZerodhaService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ZERODHA_API_KEY;
    this.apiSecret = process.env.ZERODHA_API_SECRET;
    this.kc = new KiteConnect({
      api_key: this.apiKey,
    });
  }

  // Step 1: Get login URL for authentication
  getLoginURL() {
    return this.kc.getLoginURL();
  }

  // Step 2: Generate session after getting request_token
  async generateSession(requestToken) {
    try {
      const response = await this.kc.generateSession(requestToken, this.apiSecret);
      this.kc.setAccessToken(response.access_token);
      return response;
    } catch (error) {
      console.error("Error generating session:", error);
      throw error;
    }
  }

  // Set access token if you already have it
  setAccessToken(accessToken) {
    this.kc.setAccessToken(accessToken);
  }

  // Get live market data for instruments
  async getQuote(instruments) {
    try {
      return await this.kc.getQuote(instruments);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      throw error;
    }
  }

  // Get historical data
  async getHistoricalData(instrumentToken, interval, fromDate, toDate) {
    try {
      return await this.kc.getHistoricalData(
        instrumentToken,
        interval,
        fromDate,
        toDate
      );
    } catch (error) {
      console.error("Error fetching historical data:", error);
      throw error;
    }
  }

  // Search for instruments
  async getInstruments(exchange = null) {
    try {
      return await this.kc.getInstruments(exchange);
    } catch (error) {
      console.error("Error fetching instruments:", error);
      throw error;
    }
  }

  // Get LTP (Last Traded Price) for multiple instruments
  async getLTP(instruments) {
    try {
      return await this.kc.getLTP(instruments);
    } catch (error) {
      console.error("Error fetching LTP:", error);
      throw error;
    }
  }
}

export default ZerodhaService;
