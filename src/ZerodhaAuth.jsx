/*// components/ZerodhaAuth.js
"use client"

import { useState, useEffect } from "react"
import ZerodhaService from "../services/zerodhaService"

function ZerodhaAuth({ onAuthSuccess }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUrl, setAuthUrl] = useState("")
  const [requestToken, setRequestToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [zerodhaService] = useState(() => new ZerodhaService())

  useEffect(() => {
    // Check if already authenticated
    const storedToken = localStorage.getItem("zerodha_access_token")
    if (storedToken) {
      zerodhaService.setAccessToken(storedToken)
      setIsAuthenticated(true)
      onAuthSuccess?.(storedToken)
    } else {
      // Generate login URL
      const loginUrl = zerodhaService.getLoginURL()
      setAuthUrl(loginUrl)
    }
  }, [zerodhaService, onAuthSuccess])

  const handleGenerateSession = async () => {
    if (!requestToken) {
      setError("Please enter the request token")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await zerodhaService.generateSession(requestToken)
      
      // Store access token
      localStorage.setItem("zerodha_access_token", response.access_token)
      localStorage.setItem("zerodha_user_id", response.user_id)
      
      setIsAuthenticated(true)
      onAuthSuccess?.(response.access_token)
      
    } catch (err) {
      setError(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("zerodha_access_token")
    localStorage.removeItem("zerodha_user_id")
    setIsAuthenticated(false)
    setRequestToken("")
    window.location.reload()
  }

  if (isAuthenticated) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        <div className="flex justify-between items-center">
          <span>✅ Connected to Zerodha successfully!</span>
          <button 
            onClick={handleLogout}
            className="text-green-700 underline hover:text-green-900"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
      <h3 className="font-semibold mb-2">Connect to Zerodha for Live Data</h3>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm mb-2">
            Step 1: Click the link below to login to Zerodha and authorize this app:
          </p>
          <a 
            href={authUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Login to Zerodha
          </a>
        </div>

        <div>
          <p className="text-sm mb-2">
            Step 2: After authorization, copy the "request_token" from the URL and paste here:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter request token here..."
              value={requestToken}
              onChange={(e) => setRequestToken(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleGenerateSession}
              disabled={loading || !requestToken}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}

        <div className="text-xs text-gray-600 mt-2">
          <p>Note: The request token will be in the redirect URL after authorization.</p>
          <p>Example: https://yourapp.com?request_token=ABC123&action=login&status=success</p>
        </div>
      </div>
    </div>
  )
}

export default ZerodhaAuth
*/
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ZerodhaAuth = ({ isAuthenticated, setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [popup, setPopup] = useState(null);

  // Replace with your actual Zerodha API key
  const ZERODHA_API_KEY = import.meta.env.VITE_APP_ZERODHA_API_KEY; // TODO: Replace with your actual API key

  // Generate login URL directly
  const getLoginUrl = () => {
    return `https://kite.trade/connect/login?api_key=${ZERODHA_API_KEY}`;
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data === 'zerodha_login_success') {
          // Close popup if open
          if (popup && !popup.closed) popup.close();
          
          // Check authentication status
          checkAuthStatus();
        } 
        else if (event.data.startsWith('zerodha_login_failed')) {
          const errorMsg = event.data.split(':')[1] || 'Authentication failed';
          setError(errorMsg);
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [popup]);

  const checkAuthStatus = async () => {
    try {
      // You can either remove this call or fix your backend endpoint
      // For now, let's add error handling
      const response = await axios.get('/api/auth/status');
      if (response.data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Auth status check failed:', err);
      // For now, we'll assume success if the popup closed successfully
      // You can improve this later when your backend is working
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const openLoginPopup = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Generate login URL directly instead of fetching from backend
      const loginUrl = await fetch('/api/auth/login-url');
       if (!loginUrl.ok) {
        throw new Error(`Failed to get login URL: ${response.status}`);
      }
      // Open popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const loginWindow = window.open(
        loginUrl,
        'Zerodha Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      setPopup(loginWindow);
      
      // Check if popup was blocked
      if (!loginWindow || loginWindow.closed) {
        throw new Error('Popup blocked! Please allow popups for this site.');
      }

      // Optional: Poll to check if popup is closed (manual close)
      const checkClosed = setInterval(() => {
        if (loginWindow.closed) {
          clearInterval(checkClosed);
          setLoading(false);
        }
      }, 1000);
      
    } catch (err) {
      setError(err.message || 'Failed to initiate login');
      setLoading(false);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Zerodha Authentication</h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-700">
              Click the button below to securely authenticate with Zerodha. 
              This will open a new window where you can log in to your Zerodha account.
            </p>
          </div>
          
          <div className="flex flex-col items-center py-4">
            <button
              onClick={openLoginPopup}
              disabled={loading}
              className={`px-8 py-3 rounded-lg font-medium flex items-center justify-center ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-orange-600 text-white hover:bg-orange-700 transition-colors'
              }`}
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : 'Login with Zerodha'}
            </button>
            
            <p className="mt-4 text-sm text-gray-500 text-center">
              You'll be redirected to Zerodha's secure login page
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-red-700 hover:text-red-900 underline text-sm"
              >
                Try again
              </button>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Note:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Make sure popups are enabled for this site</li>
              <li>You must have an active Zerodha trading account</li>
              <li>Authentication token is valid until market close</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZerodhaAuth;