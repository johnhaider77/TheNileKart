// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

interface PageTrackingData {
  pageType: string;
  pageIdentifier?: string;
  pageUrl: string;
}

interface CheckoutData {
  checkoutItems: any[];
  totalAmount: number;
  paymentMethod?: string;
}

interface PaymentErrorData {
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: any;
}

class MetricsService {
  private sessionId: string | null = null;
  private apiBaseUrl: string;
  private currentPageType: string | null = null;

  constructor(apiBaseUrl?: string) {
    // Get API URL from environment variable or detect from window location
    if (apiBaseUrl) {
      this.apiBaseUrl = apiBaseUrl;
    } else if (process.env.REACT_APP_API_URL) {
      this.apiBaseUrl = process.env.REACT_APP_API_URL;
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      const protocol = window.location.protocol;
      this.apiBaseUrl = `${protocol}//${window.location.hostname}/api`;
    } else {
      this.apiBaseUrl = 'http://localhost:5000/api';
    }
    this.initializeSession();
    this.setupPageUnloadHandler();
  }

  // Initialize a new session when user enters the website
  private async initializeSession(): Promise<void> {
    try {
      if (!this.sessionId) {
        const response = await fetch(`${this.apiBaseUrl}/metrics/session/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          this.sessionId = data.sessionId;
          console.log('📊 Metrics session started:', this.sessionId);
          
          // Store in sessionStorage for persistence during browser session
          if (this.sessionId) {
            sessionStorage.setItem('metricsSessionId', this.sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize metrics session:', error);
    }
  }

  // Get session ID (create if doesn't exist)
  public getSessionId(): string {
    if (!this.sessionId) {
      // Try to get from sessionStorage first
      const storedSessionId = sessionStorage.getItem('metricsSessionId');
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      } else {
        // Generate new session ID and initialize
        this.sessionId = uuidv4();
        this.initializeSession();
      }
    }
    return this.sessionId || uuidv4();
  }

  // Track page visit
  public async trackPageVisit(data: PageTrackingData): Promise<void> {
    try {
      if (!this.sessionId) {
        await this.initializeSession();
      }

      this.currentPageType = data.pageType;

      await fetch(`${this.apiBaseUrl}/metrics/track/page-visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId,
          pageType: data.pageType,
          pageIdentifier: data.pageIdentifier,
          pageUrl: data.pageUrl
        })
      });

      const identifier = data.pageIdentifier ? ` - ${data.pageIdentifier}` : '';
      console.log(`📊 Page visit tracked: ${data.pageType}${identifier}`);
    } catch (error) {
      console.error('Failed to track page visit:', error);
    }
  }

  // Track when user starts checkout process
  public async trackCheckoutStart(data: CheckoutData): Promise<void> {
    try {
      if (!this.sessionId) return;

      await fetch(`${this.apiBaseUrl}/metrics/track/checkout-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId,
          checkoutItems: data.checkoutItems,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod
        })
      });

      console.log('📊 Checkout start tracked');
    } catch (error) {
      console.error('Failed to track checkout start:', error);
    }
  }

  // Track when user starts payment process
  public async trackPaymentStart(): Promise<void> {
    try {
      if (!this.sessionId) return;

      await fetch(`${this.apiBaseUrl}/metrics/track/payment-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId
        })
      });

      console.log('📊 Payment start tracked');
    } catch (error) {
      console.error('Failed to track payment start:', error);
    }
  }

  // Track payment errors with detailed information
  public async trackPaymentError(errorData: PaymentErrorData): Promise<void> {
    try {
      if (!this.sessionId) return;

      await fetch(`${this.apiBaseUrl}/metrics/track/payment-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId,
          errorDetails: {
            errorCode: errorData.errorCode,
            errorMessage: errorData.errorMessage,
            errorDetails: errorData.errorDetails,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        })
      });

      console.log('📊 Payment error tracked:', errorData);
    } catch (error) {
      console.error('Failed to track payment error:', error);
    }
  }

  // Track successful payment
  public async trackPaymentSuccess(): Promise<void> {
    try {
      if (!this.sessionId) return;

      await fetch(`${this.apiBaseUrl}/metrics/track/payment-success`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId
        })
      });

      console.log('📊 Payment success tracked');
    } catch (error) {
      console.error('Failed to track payment success:', error);
    }
  }

  // End session when user leaves
  public async endSession(): Promise<void> {
    try {
      if (!this.sessionId) return;

      await fetch(`${this.apiBaseUrl}/metrics/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.sessionId
        })
      });

      console.log('📊 Metrics session ended');
      this.sessionId = null;
      sessionStorage.removeItem('metricsSessionId');
    } catch (error) {
      console.error('Failed to end metrics session:', error);
    }
  }

  // Setup handlers for page unload
  private setupPageUnloadHandler(): void {
    // Handle page unload (user closing tab/navigating away)
    const handlePageUnload = () => {
      if (this.sessionId) {
        // Use sendBeacon for reliability during page unload
        const data = JSON.stringify({ sessionId: this.sessionId });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`${this.apiBaseUrl}/metrics/session/end`, blob);
      }
    };
    
    // Multiple event listeners for better coverage
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('unload', handlePageUnload);

    // Send heartbeat every 30 seconds to keep session alive
    setInterval(() => {
      if (this.sessionId && !document.hidden) {
        this.sendHeartbeat();
      }
    }, 30000);

    // Handle page visibility changes (for pausing/resuming heartbeat)
    let hiddenTimer: NodeJS.Timeout | null = null;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Start timer to end session if hidden for too long (2 minutes)
        hiddenTimer = setTimeout(() => {
          if (document.hidden && this.sessionId) {
            this.endSession();
          }
        }, 120000);
      } else {
        // Clear timer and send heartbeat when user returns
        if (hiddenTimer) {
          clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }
        if (this.sessionId) {
          this.sendHeartbeat();
        }
      }
    });
  }

  // Send heartbeat to keep session active
  private async sendHeartbeat(): Promise<void> {
    if (!this.sessionId) return;
    
    try {
      await fetch(`${this.apiBaseUrl}/metrics/session/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: this.sessionId }),
        credentials: 'include'
      });
    } catch (error) {
      console.warn('📊 Failed to send heartbeat:', error);
    }
  }

  // Helper methods for common page types
  public trackHomePage(): void {
    this.trackPageVisit({
      pageType: 'homepage',
      pageUrl: window.location.href
    });
  }

  public trackCategoryPage(categoryName: string): void {
    this.trackPageVisit({
      pageType: 'category',
      pageIdentifier: categoryName,
      pageUrl: window.location.href
    });
  }

  public trackOfferPage(offerId: string): void {
    this.trackPageVisit({
      pageType: 'offer',
      pageIdentifier: offerId,
      pageUrl: window.location.href
    });
  }

  public trackCheckoutPage(): void {
    this.trackPageVisit({
      pageType: 'checkout',
      pageUrl: window.location.href
    });
  }

  public trackPaymentPage(): void {
    this.trackPageVisit({
      pageType: 'payment',
      pageUrl: window.location.href
    });
  }

  public trackPaymentErrorPage(): void {
    this.trackPageVisit({
      pageType: 'payment_error',
      pageUrl: window.location.href
    });
  }
}

// Create singleton instance
const metricsService = new MetricsService();

export default metricsService;
export { MetricsService };
export type { PageTrackingData, CheckoutData, PaymentErrorData };