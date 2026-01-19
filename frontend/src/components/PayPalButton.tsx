import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';

// Extend Window interface for PayPal and payment APIs
declare global {
  interface Window {
    paypal?: any;
    ApplePaySession?: any;
    google?: {
      payments?: any;
    };
  }
}

// Polyfill for startsWith method to prevent PayPal SDK errors
// eslint-disable-next-line no-extend-native
if (!String.prototype.startsWith) {
  // eslint-disable-next-line no-extend-native
  String.prototype.startsWith = function(searchString: string, position?: number): boolean {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// Ensure other potentially missing string methods exist
// eslint-disable-next-line no-extend-native
if (!String.prototype.includes) {
  // eslint-disable-next-line no-extend-native
  String.prototype.includes = function(searchString: string, position?: number): boolean {
    if (typeof position !== 'number') {
      position = 0;
    }
    
    if (position + searchString.length > this.length) {
      return false;
    }
    
    return this.indexOf(searchString, position) !== -1;
  };
}

interface PayPalButtonProps {
  amount: number;
  items: any[];
  shippingAddress: any;
  onSuccess: (details: any, data: any) => void;
  onError: (error: any) => void;
  onCancel?: (data: any) => void;
  disabled?: boolean;
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  items,
  shippingAddress,
  onSuccess,
  onError,
  onCancel,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false); // Start with false instead of true
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMobileFallback, setShowMobileFallback] = useState(false);
  const [buttonsRendered, setButtonsRendered] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardFormReady, setCardFormReady] = useState(false);
  const [cardFormError, setCardFormError] = useState<string | null>(null);
  const [hostedFieldsAvailable, setHostedFieldsAvailable] = useState(false);
  const cardFormRef = useRef<HTMLDivElement>(null);
  const hostedFieldsInstance = useRef<any>(null);
  const [refReady, setRefReady] = useState(false);

  // Callback ref to ensure we know when the element is ready
  const paypalRef = useRef<HTMLDivElement>(null);
  
  const paypalRefCallback = (node: HTMLDivElement | null) => {
    console.log('PayPal ref callback fired with node:', node);
    paypalRef.current = node;
    if (node) {
      console.log('PayPal ref is now available, setting refReady to true');
      setRefReady(true);
    } else {
      console.log('PayPal ref is null, setting refReady to false');
      setRefReady(false);
    }
  };

  // Enhanced mobile detection with more accurate device identification
  const isMobile = () => {
    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // Check screen size as additional indicator
    const isMobileScreen = window.innerWidth <= 768 || window.screen.width <= 768;
    
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUA || (isMobileScreen && hasTouch);
  };

  // Enhanced mobile compatibility check
  const getMobileCompatibility = () => {
    const ua = navigator.userAgent;
    const isApple = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const chromeVersion = ua.match(/Chrome\/([0-9]+)/);
    
    // More accurate Safari version detection
    const safariVersionMatch = ua.match(/Version\/([0-9]+\.[0-9]+)/);
    const safariVersion = safariVersionMatch ? parseFloat(safariVersionMatch[1]) : 0;
    
    return {
      isApple,
      isAndroid,
      isSafari,
      safariVersion,
      chromeVersion: chromeVersion ? parseInt(chromeVersion[1]) : null,
      // Only flag as needing fallback for very old Safari versions (< 14.0)
      needsFallback: isApple && isSafari && safariVersion < 14.0,
      supportsPayPal: !isApple || !isSafari || safariVersion >= 14.0 || (chromeVersion && parseInt(chromeVersion[1]) >= 80)
    };
  };

  // Apple Pay eligibility detection
  const isApplePayEligible = () => {
    const compatibility = getMobileCompatibility();
    // Apple Pay requires Safari on iOS/macOS or compatible browsers
    return compatibility.isApple && (
      compatibility.isSafari || 
      (window.ApplePaySession && typeof window.ApplePaySession.canMakePayments === 'function')
    );
  };

  // Samsung Pay/Google Pay eligibility detection  
  const isSamsungPayEligible = () => {
    const compatibility = getMobileCompatibility();
    // Samsung Pay works through Google Pay on Android devices
    return compatibility.isAndroid && (
      'PaymentRequest' in window || 
      ((window as any).google && (window as any).google.payments)
    );
  };

  // Detect if we're in sandbox/development mode
  const isSandboxMode = () => {
    // Check if client ID contains sandbox indicators
    const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'missing';
    return (
      clientId.includes('sb-') || // Sandbox client IDs often contain 'sb-'
      clientId.includes('test') || 
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost'
    );
  };

  // Enhanced payment method availability with sandbox awareness
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAvailablePaymentMethods = () => {
    const methods = ['paypal']; // PayPal is always available
    const isInSandbox = isSandboxMode();
    
    if (isInSandbox) {
      console.log('Sandbox mode detected - Apple Pay and Samsung Pay are not available in sandbox');
      return methods; // Only return PayPal for sandbox
    }
    
    if (isApplePayEligible()) {
      methods.push('applepay');
      console.log('Apple Pay is available on this device');
    }
    
    if (isSamsungPayEligible()) {
      methods.push('googlepay'); // Samsung Pay uses Google Pay API
      console.log('Samsung Pay/Google Pay is available on this device');
    }
    
    return methods;
  };

  // Popup blocker detection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const detectPopupBlocker = () => {
    try {
      const testWindow = window.open('', '_blank', 'width=1,height=1,toolbar=no,location=no,menubar=no');
      if (!testWindow || testWindow.closed || typeof testWindow.closed === 'undefined') {
        return true; // Popup blocked
      }
      testWindow.close();
      return false; // Popup allowed
    } catch (e) {
      return true; // Error opening popup, likely blocked
    }
  };

  // Check if we should show mobile fallback
  const shouldShowMobileFallback = () => {
    if (!isMobile()) return false;
    
    const compatibility = getMobileCompatibility();
    const shouldShow = showMobileFallback || compatibility.needsFallback || !compatibility.supportsPayPal;
    
    console.log('shouldShowMobileFallback check:', {
      isMobile: isMobile(),
      showMobileFallback,
      compatibility,
      shouldShow
    });
    
    return shouldShow;
  };

  // Setup global PayPal error handler
  const setupPayPalErrorHandler = () => {
    // Catch unhandled errors from PayPal SDK
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (source && source.includes('paypal.com/sdk/js')) {
        console.error('PayPal SDK Error caught:', message, error);
        setLoadError('PayPal SDK failed to load. Please try cash on delivery.');
        setIsLoading(false);
        setShowMobileFallback(true);
        return true; // Prevent the error from propagating
      }
      // Call original error handler if it exists
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Setup unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.toString().includes('PayPal')) {
        console.error('PayPal Promise rejection caught:', event.reason);
        setLoadError('PayPal service unavailable. Please use cash on delivery.');
        setIsLoading(false);
        setShowMobileFallback(true);
        event.preventDefault();
      }
    });
  };

  // Enhanced user agent setup for PayPal compatibility
  const setupUserAgentForPayPal = () => {
    const currentUA = navigator.userAgent || '';
    
    // Validate navigator properties exist before PayPal SDK uses them
    const ensureNavigatorProperties = () => {
      try {
        if (!navigator.userAgent) {
          console.warn('Missing navigator.userAgent, using fallback');
        }
        if (!navigator.platform) {
          console.warn('Missing navigator.platform, using fallback');
        }
        if (!navigator.language) {
          console.warn('Missing navigator.language, using fallback');
        }
        
        // Ensure String prototype methods exist
        if (!String.prototype.startsWith) {
          String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
          };
        }
      } catch (e) {
        console.warn('Error ensuring navigator properties:', e);
      }
    };
    
    ensureNavigatorProperties();
    
    // Check for problematic patterns
    if (!currentUA || 
        currentUA.includes('undefined') || 
        currentUA.length === 0 ||
        currentUA === 'undefined') {
      
      const fallbackUA = isMobile() ? 
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1' :
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      console.log('Using fallback user agent for PayPal compatibility:', fallbackUA);
      return fallbackUA;
    }
    return currentUA;
  };

  const loadPayPalSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Validate environment first
      if (typeof window === 'undefined') {
        reject(new Error('Window object not available'));
        return;
      }

      // Clear any potential DOM conflicts with PayPal SDK
      const clearPayPalDOMConflicts = () => {
        try {
          // If window.paypal is a DOM element, remove the conflict
          if (window.paypal && window.paypal.nodeType) {
            console.warn('Clearing DOM element conflict with window.paypal');
            delete (window as any).paypal;
          }
          
          // Ensure we have a clean global namespace for PayPal
          if (window.paypal && typeof window.paypal === 'object' && !window.paypal.Buttons) {
            console.warn('Clearing invalid PayPal object from global namespace');
            delete (window as any).paypal;
          }
        } catch (e) {
          console.warn('Error clearing PayPal DOM conflicts:', e);
        }
      };
      
      clearPayPalDOMConflicts();

      // Setup global error handlers first
      setupPayPalErrorHandler();
      
      // Setup user agent before loading PayPal SDK
      const finalUserAgent = setupUserAgentForPayPal();
      console.log('Using user agent for PayPal SDK:', finalUserAgent);

      // Check if PayPal is already loaded and functional
      if (window.paypal && 
          typeof window.paypal === 'object' &&
          window.paypal.Buttons && 
          typeof window.paypal.Buttons === 'function' &&
          window.paypal.version) {
        console.log('PayPal SDK already loaded and functional');
        resolve();
        return;
      }

      // Remove any existing PayPal scripts
      const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]');
      existingScripts.forEach(script => script.remove());

      // Clear window.paypal to force fresh initialization
      if (window.paypal) {
        delete window.paypal;
      }

      const script = document.createElement('script');
      const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'AdDtfr_P4XNO3lLxmk4x7vbltnscMWnCDEMVd3fE6HPEOpnSu8bV6GAobHwM-W95CRojTtu2UZwvquVl';
      
      // Validate client ID
      if (!clientId || clientId === 'your-paypal-client-id') {
        console.error('Invalid PayPal client ID detected:', clientId);
        reject(new Error('PayPal client ID is not properly configured. Please check your environment variables.'));
        return;
      }
      
      console.log('Using PayPal client ID:', clientId.substring(0, 10) + '...' + clientId.substring(clientId.length - 4));
      
      // PayPal SDK configuration with hosted fields for card payments
      let sdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=AED&intent=capture&components=buttons,hosted-fields&disable-funding=paylater,venmo`;
      
      console.log('Using PayPal SDK configuration with hosted fields for card payments in AED');
      
      script.src = sdkUrl;
      script.async = true;
      script.defer = true;
      
      console.log('Appending PayPal SDK script to document...');
      
      // Remove potentially problematic attributes that might cause user agent issues
      // script.crossOrigin = 'anonymous'; // Comment out as it might cause issues
      // script.setAttribute('data-partner-attribution-id', 'APPLEPAY_MP'); // Comment out

      // Add timeout to prevent hanging
      const scriptTimeout = setTimeout(() => {
        console.error('PayPal SDK script loading timeout after 15 seconds');
        console.error('This usually indicates:');
        console.error('1. Network connectivity issues');
        console.error('2. PayPal services are temporarily down');
        console.error('3. The client ID is invalid');
        console.error('4. Ad blockers or firewalls are blocking PayPal');
        script.remove();
        reject(new Error('PayPal SDK script loading timeout. Please check your internet connection and try again.'));
      }, 15000); // 15 second timeout

      script.onload = () => {
        clearTimeout(scriptTimeout);
        console.log('PayPal SDK script loaded successfully');
        console.log('PayPal SDK URL that loaded:', script.src);
        
        // Enhanced ready check with better error handling
        let attempts = 0;
        const maxAttempts = 10; // Reduced attempts but more focused
        
        const checkPayPalReady = () => {
          attempts++;
          console.log(`Checking PayPal initialization attempt ${attempts}`);
          console.log('window.paypal:', window.paypal);
          console.log('typeof window.paypal:', typeof window.paypal);
          
          // Add proper validation for PayPal object
          if (typeof window !== 'undefined') {
            // Clear any DOM element conflicts first
            const paypalElement = document.getElementById('paypal');
            if (paypalElement) {
              console.warn('Found DOM element with id="paypal", this may conflict with PayPal SDK');
            }
            
            // Check if window.paypal is the SDK object, not a DOM element
            const isPayPalSDK = window.paypal && 
              typeof window.paypal === 'object' &&
              !window.paypal.nodeType && // Ensure it's not a DOM node
              window.paypal.Buttons && 
              typeof window.paypal.Buttons === 'function';
              
            if (isPayPalSDK) {
              console.log('PayPal SDK initialized correctly');
              console.log('PayPal version:', window.paypal.version || 'version not available');
              resolve();
            } else if (attempts < maxAttempts) {
              console.log('PayPal not ready yet, retrying in', 300 * attempts, 'ms');
              setTimeout(checkPayPalReady, 300 * attempts); // Increasing delay
            } else {
              console.error('PayPal SDK failed to initialize after multiple attempts');
              console.error('Final window.paypal state:', {
                exists: !!window.paypal,
                type: typeof window.paypal,
                isDOMElement: window.paypal && window.paypal.nodeType ? true : false,
                hasButtons: !!(window.paypal && window.paypal.Buttons),
                buttonsType: window.paypal && typeof window.paypal.Buttons,
                paypalObject: window.paypal
              });
              
              // Check for common DOM conflicts
              const paypalEl = document.getElementById('paypal');
              if (paypalEl) {
                console.error('CONFLICT DETECTED: DOM element with id="paypal" found. This prevents PayPal SDK initialization.');
              }
              reject(new Error('PayPal SDK initialization timed out. The PayPal service may be temporarily unavailable.'));
            }
          }
        };
        
        // Start checking after initial delay
        setTimeout(checkPayPalReady, 100);
      };

      script.onerror = (error) => {
        clearTimeout(scriptTimeout);
        console.error('Failed to load PayPal SDK script:', error);
        console.error('Script source that failed:', script.src);
        console.error('Network connectivity test - can reach google.com?');
        
        // Test basic network connectivity
        fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
          .then(() => console.log('✓ Network connectivity is working'))
          .catch(() => console.log('✗ Network connectivity issues detected'));
          
        script.remove();
        reject(new Error('Failed to load PayPal SDK script. Please check your internet connection and try again.'));
      };

      // Enhanced global error handler for PayPal SDK issues
      const originalErrorHandler = window.onerror;
      const originalUnhandledRejection = window.onunhandledrejection;
      
      window.onerror = (message, source, lineno, colno, error) => {
        const msgStr = String(message);
        if ((msgStr.includes('startsWith') || 
             msgStr.includes('Cannot read properties of undefined') ||
             msgStr.includes('Cannot read property') ||
             msgStr.includes('undefined reading')) &&
            source && String(source).includes('paypal.com')) {
          console.error('PayPal SDK compatibility error detected:', {
            message: msgStr,
            source: String(source),
            line: lineno,
            userAgent: navigator.userAgent
          });
          
          // Clear the timeout and clean up
          clearTimeout(scriptTimeout);
          script.remove();
          
          // Set fallback state
          setLoadError('PayPal is not compatible with your browser. Please use cash on delivery.');
          setIsLoading(false);
          setShowMobileFallback(true);
          
          return true; // Prevent error propagation
        }
        return originalErrorHandler ? originalErrorHandler(message, source, lineno, colno, error) : false;
      };
      
      // Handle unhandled promise rejections from PayPal
      window.onunhandledrejection = (event) => {
        const reason = String(event.reason);
        if (reason.includes('PayPal') || reason.includes('startsWith')) {
          console.error('PayPal promise rejection:', event.reason);
          setLoadError('PayPal service temporarily unavailable. Please use cash on delivery.');
          setIsLoading(false);
          setShowMobileFallback(true);
          event.preventDefault();
          return;
        }
        return originalUnhandledRejection ? originalUnhandledRejection.call(window, event) : undefined;
      };

      document.head.appendChild(script);
    });
  };

  // Check if PayPal HostedFields is available
  const checkHostedFieldsAvailability = () => {
    if (window.paypal && 
        typeof window.paypal === 'object' &&
        window.paypal.HostedFields && 
        typeof window.paypal.HostedFields.render === 'function') {
      console.log('PayPal HostedFields is available');
      setHostedFieldsAvailable(true);
      // Automatically show card form in production/live mode
      setShowCardForm(true);
      // Also immediately set card form ready for faster UI update
      setCardFormReady(true);
      return true;
    }
    console.warn('PayPal HostedFields not available yet');
    setHostedFieldsAvailable(false);
    return false;
  };

  const initializeHostedFields = async () => {
    try {
      console.log('Initializing secure card form...');
      console.log('window.paypal status:', { exists: !!window.paypal, type: typeof window.paypal });
      
      if (!window.paypal) {
        throw new Error('PayPal SDK not loaded. Please refresh and try again.');
      }
      
      // Wait for window.paypal.HostedFields to be available
      let attempts = 0;
      const maxAttempts = 20;
      const timeoutMs = 15000; // 15 second total timeout
      const startTime = Date.now();
      
      // Direct check for HostedFields without relying on checkHostedFieldsAvailability
      console.log('Starting HostedFields availability check...');
      while ((!window.paypal || !window.paypal.HostedFields) && attempts < maxAttempts) {
        attempts++;
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > timeoutMs) {
          console.error('Timeout waiting for HostedFields after', elapsedMs, 'ms');
          console.log('window.paypal object:', Object.keys(window.paypal || {}));
          throw new Error('Payment form initialization timeout. Please refresh and try again.');
        }
        console.log(`Waiting for HostedFields, attempt ${attempts}/${maxAttempts}, elapsed ${elapsedMs}ms`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (!window.paypal || !window.paypal.HostedFields) {
        console.error('HostedFields not found after attempts:', { 
          paypalExists: !!window.paypal,
          hasHostedFields: !!(window.paypal && window.paypal.HostedFields),
          paypalKeys: Object.keys(window.paypal || {})
        });
        throw new Error('Payment service not available. Please refresh and try again.');
      }
      
      console.log('HostedFields is available, attempting to render...');
      
      // Check if DOM elements exist for card form
      const cardNumberEl = document.getElementById('card-number');
      const expirationEl = document.getElementById('expiration-date');
      const cvvEl = document.getElementById('cvv');
      
      console.log('DOM element check:', {
        cardNumber: !!cardNumberEl,
        expiration: !!expirationEl,
        cvv: !!cvvEl
      });
      
      if (!cardNumberEl || !expirationEl || !cvvEl) {
        console.warn('Card form DOM elements not found yet, waiting...');
        // Give it another second for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      try {
        console.log('Starting HostedFields.render() call...');
        
        const hostedFields = await window.paypal.HostedFields.render({
          createOrder: async () => {
            try {
              console.log('createOrder callback triggered');
              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/paypal/create`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  total_amount: parseFloat(amount.toFixed(2)),
                  items: items,
                  device_type: isMobile() ? 'mobile' : 'desktop',
                  shipping_address: {
                    full_name: shippingAddress.full_name || shippingAddress.fullName || 
                             `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
                    address_line1: shippingAddress.address_line1 || shippingAddress.addressLine1 || shippingAddress.street,
                    address_line2: shippingAddress.address_line2 || shippingAddress.addressLine2 || '',
                    city: shippingAddress.city,
                    state: shippingAddress.state || shippingAddress.region,
                    postal_code: shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.zipCode,
                    country: shippingAddress.country || 'US'
                  }
                })
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Server connection failed' }));
                throw new Error(errorData.message || 'Failed to create PayPal order');
              }

              const orderData = await response.json();
              console.log('Order created successfully:', orderData.id);
              return orderData.id;
            } catch (error) {
              console.error('Error in createOrder callback:', error);
              throw error;
            }
          },
          styles: {
            'input': {
              'font-size': '16px',
              'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              'color': '#333'
            },
            ':focus': {
              'color': '#333'
            },
            '.invalid': {
              'color': '#dc3545'
            }
          },
          fields: {
            number: {
              selector: '#card-number',
              placeholder: '1234 5678 9012 3456'
            },
            cvv: {
              selector: '#cvv',
              placeholder: '123'
            },
            expirationDate: {
              selector: '#expiration-date',
              placeholder: 'MM/YY'
            }
          }
        });
        
        console.log('HostedFields.render() returned successfully');
        hostedFieldsInstance.current = hostedFields;
      } catch (renderError) {
        console.error('❌ Error during HostedFields.render():', renderError);
        throw renderError;
      }
      
      const hostedFields = hostedFieldsInstance.current;

      setCardFormReady(true);
      setCardFormError(null);
      setHostedFieldsAvailable(true);
      console.log('✅ PayPal hosted fields initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing card form:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Detailed error info:', {
        message: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error,
        fullError: error,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Show specific error messages based on what failed
      let userMessage = 'Unable to load payment form. Please refresh and try again.';
      
      if (errorMessage.includes('timeout')) {
        userMessage = 'Payment form is taking too long to load. Please refresh the page and try again.';
      } else if (errorMessage.includes('not available')) {
        userMessage = 'Payment service is currently unavailable. Please try again in a moment.';
      } else if (errorMessage.includes('not loaded')) {
        userMessage = 'Payment service failed to load. Please check your internet connection and refresh.';
      }
      
      setCardFormError(userMessage);
      setShowCardForm(false);
      setHostedFieldsAvailable(false);
      setCardFormReady(false);
      setIsLoading(false);
      
      // Call error callback to navigate back to checkout with error
      if (onError) {
        setTimeout(() => {
          onError(new Error(userMessage));
        }, 500);
      }
    }
  };

  const initializePayPal = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // Check if required props are available
      if (!shippingAddress || !items || items.length === 0) {
        setLoadError('Missing required data for payment');
        setIsLoading(false);
        return;
      }

      // Load PayPal SDK
      await loadPayPalSDK();

      // Double-check PayPal is ready after loading
      if (!window.paypal || 
          typeof window.paypal !== 'object' ||
          !window.paypal.Buttons ||
          typeof window.paypal.Buttons !== 'function') {
        console.error('PayPal validation failed:', {
          hasPaypal: !!window.paypal,
          paypalType: typeof window.paypal,
          hasButtons: !!(window.paypal && window.paypal.Buttons),
          buttonsType: window.paypal && typeof window.paypal.Buttons,
          userAgent: navigator.userAgent
        });
        throw new Error('PayPal SDK not properly initialized');
      }

      // Clear previous buttons
      if (paypalRef.current) {
        paypalRef.current.innerHTML = '';
        console.log('Cleared PayPal container before creating new buttons');
      }
      
      // Reset buttons rendered state
      setButtonsRendered(false);

      console.log('Creating PayPal buttons...');

      // Get mobile compatibility info
      const compatibility = getMobileCompatibility();
      console.log('Mobile compatibility check:', compatibility);

      // Create PayPal buttons with mobile-responsive styling
      const mobileStyle = isMobile() ? {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        tagline: false,
        height: 44, // Larger height for easier touch interaction
        width: window.innerWidth <= 480 ? null : 350 // Full width on small screens
      } : {
        layout: 'horizontal',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        tagline: false,
        height: 40
      };
      
      console.log('PayPal button style:', mobileStyle);
      
      const buttons = window.paypal.Buttons({
        style: {
          layout: 'horizontal',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          tagline: false,
          height: 45
        },
        
        // Simplified funding configuration - just enable PayPal login
        funding: {
          allowed: [window.paypal.FUNDING.PAYPAL],
          disallowed: [window.paypal.FUNDING.CARD, window.paypal.FUNDING.CREDIT, window.paypal.FUNDING.VENMO, window.paypal.FUNDING.PAYLATER]
        },
        
        // Configure payment flow - simple configuration
        onInit: (data: any, actions: any) => {
          console.log('PayPal buttons initialized:', data);
        },
        
        async createOrder(data: any, actions: any) {
          try {
            console.log('Creating PayPal order...');
            
            // Validate required data
            if (!shippingAddress.full_name && !shippingAddress.fullName && 
                !(shippingAddress.firstName || shippingAddress.lastName)) {
              throw new Error('Please complete your shipping address - missing name');
            }
            
            if (!shippingAddress.address_line1 && !shippingAddress.addressLine1 && !shippingAddress.street) {
              throw new Error('Please complete your shipping address - missing address');
            }

            // Create order through backend with mobile device information
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/paypal/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                total_amount: parseFloat(amount.toFixed(2)),
                items: items,
                device_type: isMobile() ? 'mobile' : 'desktop',
                user_agent: navigator.userAgent,
                screen_width: window.screen.width,
                viewport_width: window.innerWidth,
                shipping_address: {
                  full_name: shippingAddress.full_name || shippingAddress.fullName || 
                           `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
                  address_line1: shippingAddress.address_line1 || shippingAddress.addressLine1 || shippingAddress.street,
                  address_line2: shippingAddress.address_line2 || shippingAddress.addressLine2 || '',
                  city: shippingAddress.city,
                  state: shippingAddress.state || shippingAddress.region,
                  postal_code: shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.zipCode,
                  country: shippingAddress.country || 'US'
                }
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Server connection failed' }));
              console.error('PayPal order creation failed:', errorData);
              throw new Error(errorData.message || 'Failed to create PayPal order. Please try again.');
            }

            const orderData = await response.json();
            console.log('PayPal order created successfully:', orderData.id);
            
            // Validate order response
            if (!orderData || !orderData.id) {
              throw new Error('Invalid order response from server. Please try again.');
            }
            
            return orderData.id;
          } catch (error) {
            console.error('Error creating PayPal order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Order creation failed';
            
            // Show specific error to user
            setLoadError(`Order creation failed: ${errorMessage}`);
            setShowMobileFallback(true);
            
            onError(error);
            throw error;
          }
        },

        async onApprove(data: any, actions: any) {
          try {
            console.log('PayPal payment approved:', data);

            // Capture payment through backend
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/paypal/capture/${data.orderID}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                items: items,
                shipping_address: {
                  full_name: shippingAddress.full_name || shippingAddress.fullName || 
                           `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
                  address_line1: shippingAddress.address_line1 || shippingAddress.addressLine1 || shippingAddress.street,
                  address_line2: shippingAddress.address_line2 || shippingAddress.addressLine2 || '',
                  city: shippingAddress.city,
                  state: shippingAddress.state || shippingAddress.region,
                  postal_code: shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.zipCode,
                  country: shippingAddress.country || 'US'
                }
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
              console.error('PayPal capture failed:', errorData);
              throw new Error(errorData.message || 'Failed to capture PayPal payment. Please contact support.');
            }

            const details = await response.json();
            console.log('PayPal payment captured successfully:', details);
            
            // Ensure payment was actually captured
            if (!details || !details.id) {
              throw new Error('Payment capture response is invalid. Please contact support.');
            }
            
            onSuccess(details, data);
          } catch (error) {
            console.error('Error capturing PayPal payment:', error);
            const errorMessage = error instanceof Error ? error.message : 'Payment completion failed';
            
            // Show specific error message to user
            setLoadError(`Payment not completed: ${errorMessage}`);
            setShowMobileFallback(true);
            
            onError(error);
          }
        },

        onCancel(data: any) {
          console.log('PayPal payment cancelled by user:', data);
          
          // Show user-friendly cancellation message
          setLoadError('Payment was cancelled. You can try again or use Cash on Delivery.');
          setShowMobileFallback(true);
          
          if (onCancel) {
            onCancel(data);
          }
        },

        onError(err: any) {
          console.error('PayPal error:', err);
          
          // Handle PayPal service-specific errors (SMS limits, region issues, etc.)
          if (err && (
            String(err).includes('weasley_initiate_phone_confirmation_sms_limit_exceeded') ||
            String(err).includes('sms_limit_exceeded') ||
            String(err).includes('phone_confirmation') ||
            err.message?.includes('SMS limit') ||
            err.message?.includes('phone confirmation') ||
            err.details?.includes('confirmation')
          )) {
            console.warn('PayPal phone/SMS verification issue - providing alternative');
            
            setLoadError('PayPal phone verification is temporarily unavailable for your region. Please use Cash on Delivery or try again later.');
            setShowMobileFallback(true);
            return;
          }
          
          // Handle specific card validation errors
          if (err && (
            err.message?.includes("card can't be used") || 
            err.message?.includes('different card') ||
            err.message?.includes('card validation') ||
            err.message?.includes('card details') ||
            err.message?.includes('details are correct') ||
            err.toString().includes('add this card') ||
            err.details?.includes('card') ||
            String(err).includes('scf_recoverable_page_error') ||
            String(err).includes('VALIDATION_ERROR')
          )) {
            console.warn('PayPal card validation error - providing alternative options');
            
            const cardErrorMessage = isMobile() 
              ? 'Card payment not available on mobile. Please use PayPal account login or Cash on Delivery.'
              : 'This card cannot be processed. Please try: 1) PayPal account login 2) Different card 3) Cash on Delivery';
            
            setLoadError(cardErrorMessage);
            setShowMobileFallback(true);
            return;
          }
          
          // Handle popup blocker errors specifically
          if (err && (
            err.message?.includes('popup') || 
            err.message?.includes('blocked') ||
            err.toString().includes('popup') ||
            err.toString().includes('blocked') ||
            err.err?.includes('popup') ||
            err.err?.includes('blocked')
          )) {
            console.warn('PayPal popup blocked - suggesting alternative');
            
            // Show user-friendly popup blocker message
            const popupMessage = isMobile() 
              ? 'PayPal checkout was blocked. Please allow popups for this site or use Cash on Delivery.'
              : 'PayPal checkout was blocked by your browser. Please allow popups for this site and try again.';
            
            setLoadError(popupMessage);
            setShowMobileFallback(true);
            return;
          }
          
          onError(err);
        }
      });

      // Render buttons with comprehensive error handling
      if (paypalRef.current && !disabled) {
        try {
          console.log('Attempting to render PayPal buttons to:', paypalRef.current);
          console.log('PayPal buttons object:', buttons);
          console.log('Container HTML before render:', paypalRef.current.innerHTML);
          
          // Double-check ref is still available before rendering
          if (!paypalRef.current) {
            throw new Error('PayPal container ref became null before rendering');
          }
          
          const renderPromise = buttons.render(paypalRef.current);
          
          if (renderPromise && typeof renderPromise.then === 'function') {
            await renderPromise;
          }
          
          console.log('PayPal buttons rendered successfully');
          console.log('Container HTML after render:', paypalRef.current.innerHTML);
          console.log('Container children count:', paypalRef.current.children.length);
          
          // Double-check that buttons are actually visible
          if (paypalRef.current.children.length === 0) {
            console.warn('PayPal buttons rendered but no child elements found!');
            throw new Error('PayPal buttons rendered but are not visible');
          }
          
          // Set state to indicate buttons are successfully rendered
          setButtonsRendered(true);
          console.log('PayPal buttons state updated - buttons are now visible');
          
          // Immediately check for HostedFields availability
          checkHostedFieldsAvailability();
          
          // Check for HostedFields availability after buttons are rendered
          setTimeout(() => {
            checkHostedFieldsAvailability();
          }, 300); // Reduced from 1000ms to 300ms
          
          // Set a timeout to check if buttons are still working after 2 seconds
          setTimeout(() => {
            if (paypalRef.current && paypalRef.current.children.length > 0) {
              console.log('PayPal buttons confirmed to be working after 2 seconds');
            }
          }, 2000);
        } catch (renderError) {
          console.error('PayPal button render error:', renderError);
          console.error('Render error details:', {
            error: renderError instanceof Error ? renderError.message : String(renderError),
            stack: renderError instanceof Error ? renderError.stack : 'No stack trace available',
            paypalRef: !!paypalRef.current,
            disabled,
            buttons: typeof buttons,
            containerHTML: paypalRef.current?.innerHTML || 'null'
          });
          const errorMessage = renderError instanceof Error ? renderError.message : 'Unknown render error';
          throw new Error(`Failed to render PayPal buttons: ${errorMessage}`);
        }
      } else {
        console.warn('Cannot render PayPal buttons:', {
          hasRef: !!paypalRef.current,
          disabled,
          refElement: paypalRef.current
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('PayPal initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load PayPal. Please try again.';
      
      // Reset buttons rendered state on error
      setButtonsRendered(false);
      
      // If mobile device and PayPal fails, suggest using alternative
      if (isMobile() && (errorMessage.includes('timeout') || errorMessage.includes('startsWith'))) {
        setShowMobileFallback(true);
        setLoadError('PayPal is not available on this mobile device. Please use Cash on Delivery instead.');
      } else {
        setLoadError(errorMessage);
      }
      setIsLoading(false);
    }
  }, [items, shippingAddress]); // Keep original dependencies

  // Simple useLayoutEffect - only initialize hosted fields directly for card payment
  useLayoutEffect(() => {
    console.log('PayPalButton component mounted - initializing card form');
    
    const initializeSDK = async () => {
      try {
        setIsLoading(true);
        setShowCardForm(true);
        console.log('Loading payment SDK for card payments...');
        
        // Load PayPal SDK
        await loadPayPalSDK();
        
        // Directly initialize hosted fields
        console.log('Initializing card payment form...');
        setIsLoading(false);
        await initializeHostedFields();
      } catch (error) {
        console.error('Error during SDK initialization:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unable to load payment form. Please try again.';
        setLoadError(errorMsg);
        setIsLoading(false);
        
        // Trigger error callback to navigate back to checkout
        setTimeout(() => {
          if (onError) onError(new Error(errorMsg));
        }, 500);
      }
    };

    if (!disabled) {
      initializeSDK();
    }
  }, [disabled, onError]);

  // Show only card form - no PayPal buttons or fallbacks
  return (
    <div style={{ width: '100%' }}>
      {isLoading && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          background: '#e3f2fd',
          borderRadius: '8px',
          color: '#1565c0',
          fontSize: '0.95rem'
        }}>
          <div style={{ marginBottom: '8px' }}>Loading secure payment form...</div>
          <div style={{ fontSize: '0.85rem', color: '#0d47a1' }}>Please wait while we prepare your card form</div>
        </div>
      )}

      {loadError && (
        <div style={{ 
          padding: '12px', 
          textAlign: 'center', 
          background: '#ffebee', 
          borderRadius: '8px',
          color: '#c62828',
          border: '1px solid #ffcdd2',
          marginBottom: '12px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Payment Service Error</strong>
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {loadError}
          </div>
          <button 
            onClick={() => {
              console.log('Retrying card form...');
              setLoadError(null);
              setCardFormReady(false);
              setTimeout(() => {
                initializeHostedFields();
              }, 500);
            }}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Card Payment Form - Always visible when not loading */}
      {!isLoading && !loadError && (
        <div style={{
          border: '2px solid #0070f3',
          borderRadius: '12px',
          padding: '20px',
          background: 'linear-gradient(135deg, #f8fffe 0%, #f0f9ff 100%)'
        }}>
          <div ref={cardFormRef}>
            {cardFormError ? (
              <div>
                <div style={{
                  padding: '12px',
                  background: '#ffebee',
                  border: '1px solid #ffcdd2',
                  borderRadius: '6px',
                  color: '#c62828',
                  marginBottom: '12px',
                  fontSize: '0.9rem'
                }}>
                  {cardFormError}
                </div>
              </div>
            ) : (
              <>
                {/* Card Form Fields */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600', 
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    Card Number *
                  </label>
                  <div 
                    id="card-number" 
                    style={{
                      height: '44px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontWeight: '600', 
                      color: '#333',
                      fontSize: '0.9rem'
                    }}>
                      Expiration Date *
                    </label>
                    <div 
                      id="expiration-date"
                      style={{
                        height: '44px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '10px',
                        background: 'white'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontWeight: '600', 
                      color: '#333',
                      fontSize: '0.9rem'
                    }}>
                      Security Code *
                    </label>
                    <div 
                      id="cvv"
                      style={{
                        height: '44px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '10px',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>

                {/* Complete Payment Button */}
                {cardFormReady && (
                  <button
                    onClick={async () => {
                      try {
                        if (!hostedFieldsInstance.current) {
                          throw new Error('Card form is not ready');
                        }

                        const { nonce } = await hostedFieldsInstance.current.request();
                        
                        // Submit payment
                        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://www.thenilekart.com'}/paypal/process-card`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: JSON.stringify({
                            payment_method_nonce: nonce,
                            amount: parseFloat(amount.toFixed(2)),
                            items,
                            device_type: isMobile() ? 'mobile' : 'desktop',
                            shipping_address: {
                              full_name: shippingAddress.full_name || shippingAddress.fullName || 
                                       `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
                              address_line1: shippingAddress.address_line1 || shippingAddress.addressLine1 || shippingAddress.street,
                              address_line2: shippingAddress.address_line2 || shippingAddress.addressLine2 || '',
                              city: shippingAddress.city,
                              state: shippingAddress.state || shippingAddress.region,
                              postal_code: shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.zipCode,
                              country: shippingAddress.country || 'US'
                            }
                          })
                        });

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({ message: 'Payment processing failed' }));
                          throw new Error(errorData.message || 'Payment failed');
                        }

                        const result = await response.json();
                        onSuccess(result, { status: 'COMPLETED' });
                      } catch (error) {
                        onError(error);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#218838'}
                    onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = '#28a745'}
                  >
                    Complete Payment
                  </button>
                )}
                
                {!cardFormReady && (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: '#fff3cd',
                    borderRadius: '6px',
                    color: '#856404',
                    fontSize: '0.9rem'
                  }}>
                    Setting up secure card form...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalButton;