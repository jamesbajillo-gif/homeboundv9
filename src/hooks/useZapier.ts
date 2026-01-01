import { useState, useCallback } from 'react';
import { ZapierIntegration } from '@/lib/zapier';
import { mysqlApi } from '@/lib/mysqlApi';
import { toast } from 'sonner';

interface UseZapierOptions {
  showToasts?: boolean;
  validateData?: boolean;
}

export const useZapier = (options: UseZapierOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const sendToWebhook = useCallback(async (webhookUrl: string, data: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const integration = new ZapierIntegration(webhookUrl, {
        validateData: options.validateData ?? true
      });
      
      const result = await integration.send(data);
      setLastResult(result);

      if (options.showToasts !== false) {
        toast.success('Data sent to Zapier successfully!');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send data to Zapier';
      setError(errorMessage);

      if (options.showToasts !== false) {
        toast.error(errorMessage);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.showToasts, options.validateData]);

  const sendToAllActiveWebhooks = useCallback(async (data: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const webhooks = await mysqlApi.getAll<{
        id: number | string;
        webhook_url: string;
        webhook_name: string | null;
        is_active: boolean;
      }>('homebound_zapier_settings', {
        where: { is_active: true }
      });

      if (!webhooks || webhooks.length === 0) {
        throw new Error('No active webhooks configured');
      }

      const results = await Promise.allSettled(
        webhooks.map(webhook => {
          const integration = new ZapierIntegration(webhook.webhook_url, {
            validateData: options.validateData ?? true
          });
          return integration.send(data);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const resultSummary = {
        total: webhooks.length,
        successful,
        failed,
        webhooks: webhooks.map((w, i) => ({
          name: w.webhook_name || 'Untitled',
          success: results[i].status === 'fulfilled',
          error: results[i].status === 'rejected' ? (results[i] as PromiseRejectedResult).reason.message : null
        }))
      };

      setLastResult(resultSummary);

      if (options.showToasts !== false) {
        if (failed === 0) {
          toast.success(`Data sent to all ${successful} webhook(s) successfully!`);
        } else {
          toast.warning(`Sent to ${successful} webhook(s), ${failed} failed`);
        }
      }

      return resultSummary;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send data to webhooks';
      setError(errorMessage);

      if (options.showToasts !== false) {
        toast.error(errorMessage);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.showToasts, options.validateData]);

  return {
    sendToWebhook,
    sendToAllActiveWebhooks,
    loading,
    error,
    lastResult,
  };
};
