/**
 * Zapier Integration Utility
 * Based on official Zapier API documentation
 */

import { mysqlApi } from './mysql-api';

// Rate Limiter Implementation
class RateLimiter {
  private requests: Map<string, number[]>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(identifier: string = 'default'): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier)!;
    const recentRequests = userRequests.filter(time => time > windowStart);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  getRemainingRequests(identifier: string = 'default'): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const userRequests = this.requests.get(identifier) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);

    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

// Data Validation
export interface LeadQualificationData {
  borrower_first_name: string;
  borrower_last_name?: string;
  borrower_email: string;
  borrower_phone: string;
  borrower_date_of_birth?: string;
  annual_income?: number;
  borrower_address?: string;
  borrower_city?: string;
  borrower_state?: string;
  borrower_postal_code?: string;
  property_value?: number;
  property_type?: string;
  property_occupancy?: string;
  current_mortgage_balance?: number;
  current_interest_rate?: string;
  refinance_type?: string;
  credit_score_range?: string;
  source_id?: string;
  custom_fields?: Record<string, any>;
}

const isValidEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const pattern = /^[\d\s\-\(\)\+]{10,15}$/;
  return pattern.test(phone);
};

const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

const sanitizeData = (data: Record<string, any>): Record<string, any> => {
  return Object.keys(data).reduce((acc, key) => {
    acc[key] = typeof data[key] === 'string' 
      ? sanitizeString(data[key]) 
      : data[key];
    return acc;
  }, {} as Record<string, any>);
};

const validateLeadData = (data: Partial<LeadQualificationData>): void => {
  const required = ['borrower_first_name', 'borrower_email', 'borrower_phone'];
  const missing = required.filter(field => !data[field as keyof LeadQualificationData]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (data.borrower_email && !isValidEmail(data.borrower_email)) {
    throw new Error('Invalid email format');
  }

  if (data.borrower_phone && !isValidPhone(data.borrower_phone)) {
    throw new Error('Invalid phone format');
  }

  if (data.property_value && (data.property_value < 0 || data.property_value > 10000000)) {
    throw new Error('Property value must be between 0 and 10,000,000');
  }
};

// Zapier Integration Class
export interface ZapierOptions {
  timeout?: number;
  retries?: number;
  validateData?: boolean;
  sanitizeData?: boolean;
}

export class ZapierIntegration {
  private webhookUrl: string;
  private options: Required<ZapierOptions>;
  private rateLimiter: RateLimiter;
  private metrics: {
    requests: number;
    successes: number;
    failures: number;
    totalResponseTime: number;
  };

  constructor(webhookUrl: string, options: ZapierOptions = {}) {
    this.webhookUrl = webhookUrl;
    this.options = {
      timeout: 30000,
      retries: 3,
      validateData: true,
      sanitizeData: true,
      ...options
    };
    this.rateLimiter = new RateLimiter();
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalResponseTime: 0
    };
  }

  async send(data: Record<string, any>): Promise<any> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      // Check rate limit
      if (!this.rateLimiter.isAllowed('default')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Sanitize data
      let processedData = this.options.sanitizeData ? sanitizeData(data) : data;

      // Validate data if it looks like lead data
      if (this.options.validateData && data.borrower_email) {
        validateLeadData(processedData);
      }

      // Add metadata
      processedData = {
        ...processedData,
        timestamp: new Date().toISOString(),
        triggered_from: typeof window !== 'undefined' ? window.location.origin : 'server',
      };

      console.log('Sending data to Zapier:', { url: this.webhookUrl, data: processedData });

      // Send request with retry logic
      const result = await this.retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
          const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'HomeboundApp/1.0'
            },
            mode: 'no-cors',
            body: JSON.stringify(processedData),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Note: no-cors mode doesn't give us access to response body/status
          // We assume success if no error was thrown
          return {
            success: true,
            message: 'Request sent successfully',
            timestamp: new Date().toISOString()
          };
        } catch (error: any) {
          clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          
          throw error;
        }
      });

      this.metrics.successes++;
      this.metrics.totalResponseTime += Date.now() - startTime;

      console.log('Zapier request successful:', result);
      return result;

    } catch (error: any) {
      this.metrics.failures++;
      console.error('Zapier request failed:', error);
      throw error;
    }
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === this.options.retries) {
          throw error;
        }

        // Exponential backoff: 2^attempt * 1000ms (2s, 4s, 8s, etc.)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt} failed, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Retry logic failed unexpectedly');
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.metrics.requests > 0
        ? this.metrics.totalResponseTime / this.metrics.requests
        : 0,
      successRate: this.metrics.requests > 0
        ? (this.metrics.successes / this.metrics.requests) * 100
        : 0
    };
  }

  getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests('default');
  }
}

// Helper function to get active webhooks from database
export const getActiveWebhooks = async (): Promise<string[]> => {
  try {
    const allWebhooks = await mysqlApi.fetchAll<{ webhook_url: string; is_active: boolean }>('zapier_settings');
    const activeWebhooks = allWebhooks.filter(w => w.is_active);
    return activeWebhooks.map(w => w.webhook_url);
  } catch (error) {
    console.error('Error fetching active webhooks:', error);
    return [];
  }
};

// Send to all active webhooks
export const sendToAllWebhooks = async (
  data: Record<string, any>
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  const webhookUrls = await getActiveWebhooks();
  
  if (webhookUrls.length === 0) {
    console.warn('No active webhooks configured');
    return { successful: 0, failed: 0, errors: ['No active webhooks configured'] };
  }

  const results = await Promise.allSettled(
    webhookUrls.map(url => {
      const integration = new ZapierIntegration(url);
      return integration.send(data);
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason.message);

  return { successful, failed, errors };
};
