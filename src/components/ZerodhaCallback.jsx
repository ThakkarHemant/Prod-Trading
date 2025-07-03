import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ZerodhaCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');
  
  useEffect(() => {
    // Add a small delay to ensure everything is loaded
    const timer = setTimeout(() => {
      processCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const processCallback = () => {
    try {
      const requestToken = searchParams.get('request_token');
      const authStatus = searchParams.get('status');
      const error = searchParams.get('error');
      const state = searchParams.get('state');
      
      console.log('React Callback - Params:', { requestToken, authStatus, error, state });
      console.log('Window opener exists:', !!window.opener);

      if (!window.opener || window.opener.closed) {
        console.error('No valid window opener');
        setStatus('error');
        setMessage('No parent window found. Please close this window and try again.');
        return;
      }

      // Clean up stored state
      const storedState = sessionStorage.getItem('oauth_state');
      if (storedState) {
        sessionStorage.removeItem('oauth_state');
      }

      let messageToSend;

      if (requestToken && (authStatus === 'success' || !authStatus)) {
        messageToSend = {
          type: 'zerodha_auth',
          status: 'success',
          token: requestToken
        };
        setStatus('success');
        setMessage('Authentication successful! Closing window...');
      } else {
        messageToSend = {
          type: 'zerodha_auth',
          status: 'error',
          error: error || authStatus || 'Authentication failed'
        };
        setStatus('error');
        setMessage(`Authentication failed: ${error || 'Unknown error'}`);
      }

      console.log('Sending message to parent:', messageToSend);

      // Send message with multiple attempts
      let attempts = 0;
      const maxAttempts = 5;
      
      const sendMessage = () => {
        try {
          if (window.opener && !window.opener.closed) {
            // Try multiple origins
            const origins = [window.location.origin, '*'];
            origins.forEach(origin => {
              window.opener.postMessage(messageToSend, origin);
            });
            console.log('Message sent successfully');
            
            // Close window after successful send
            setTimeout(() => {
              window.close();
            }, messageToSend.status === 'success' ? 1500 : 3000);
          } else {
            throw new Error('Parent window not available');
          }
        } catch (err) {
          console.error('Failed to send message, attempt:', attempts + 1, err);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(sendMessage, 200);
          } else {
            setMessage('Failed to communicate with parent window. Please close this window manually.');
          }
        }
      };

      sendMessage();

    } catch (err) {
      console.error('Callback processing error:', err);
      setStatus('error');
      setMessage('Failed to process authentication');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="text-green-600 text-4xl mb-4">✓</div>
        )}
        {status === 'error' && (
          <div className="text-red-600 text-4xl mb-4">✗</div>
        )}
        
        <h1 className="text-xl font-bold mb-4">
          {status === 'success' ? 'Success!' : 
           status === 'error' ? 'Error' : 'Processing...'}
        </h1>
        <p className="text-gray-600">{message}</p>
        
        {status !== 'processing' && (
          <button 
            onClick={() => window.close()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close Window
          </button>
        )}
      </div>
    </div>
  );
}