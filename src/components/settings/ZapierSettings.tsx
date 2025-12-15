import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { mysqlApi } from "@/lib/mysql-api";
import { toast } from "sonner";
import { Loader2, Zap, ExternalLink, Copy, CheckCheck, Plus, Edit, Trash2, TestTube } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ZapierWebhook {
  id: number;
  webhook_url: string;
  webhook_name: string | null;
  description: string | null;
  is_active: boolean;
}

export const ZapierSettings = () => {
  const [webhooks, setWebhooks] = useState<ZapierWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ZapierWebhook | null>(null);
  const [formData, setFormData] = useState({
    webhook_url: '',
    webhook_name: '',
    description: '',
    is_active: true,
  });
  const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const data = await mysqlApi.fetchAll<ZapierWebhook>("zapier_settings");
      
      // Sort by created_at (newest first) - assuming id is auto-increment
      const sortedData = data.sort((a, b) => b.id - a.id);
      setWebhooks(sortedData);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Failed to load Zapier webhooks");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async (url: string, id: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Webhook URL copied to clipboard!");
      
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy URL");
    }
  };

  const openAddDialog = () => {
    setEditingWebhook(null);
    setFormData({
      webhook_url: '',
      webhook_name: '',
      description: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (webhook: ZapierWebhook) => {
    setEditingWebhook(webhook);
    setFormData({
      webhook_url: webhook.webhook_url,
      webhook_name: webhook.webhook_name || '',
      description: webhook.description || '',
      is_active: webhook.is_active,
    });
    setDialogOpen(true);
  };

  const validateWebhookUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && urlObj.hostname.includes('zapier.com');
    } catch {
      return false;
    }
  };

  const handleSaveWebhook = async () => {
    const trimmedUrl = formData.webhook_url.trim();
    
    if (!trimmedUrl) {
      toast.error("Webhook URL is required");
      return;
    }

    // Validate webhook URL format
    if (!validateWebhookUrl(trimmedUrl)) {
      toast.error("Please enter a valid Zapier webhook URL (must be https://hooks.zapier.com/...)");
      return;
    }

    try {
      setLoading(true);

      if (editingWebhook) {
        // Update existing webhook
        await mysqlApi.update("zapier_settings", editingWebhook.id, {
          webhook_url: trimmedUrl,
          webhook_name: formData.webhook_name.trim() || null,
          description: formData.description.trim() || null,
          is_active: formData.is_active ? 1 : 0,
        });
        toast.success("Webhook updated successfully!");
      } else {
        // Add new webhook
        await mysqlApi.create("zapier_settings", {
          webhook_url: trimmedUrl,
          webhook_name: formData.webhook_name.trim() || null,
          description: formData.description.trim() || null,
          is_active: formData.is_active ? 1 : 0,
        });
        toast.success("Webhook added successfully!");
      }

      setDialogOpen(false);
      fetchWebhooks();
    } catch (error: any) {
      console.error("Error saving webhook:", error);
      if (error.message?.includes('Duplicate')) {
        toast.error("A webhook with this URL already exists");
      } else {
        toast.error("Failed to save webhook");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    try {
      setLoading(true);
      await mysqlApi.delete("zapier_settings", id);
      toast.success("Webhook deleted successfully!");
      fetchWebhooks();
    } catch (error: any) {
      console.error("Error deleting webhook:", error);
      toast.error("Failed to delete webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (webhook: ZapierWebhook) => {
    try {
      await mysqlApi.update("zapier_settings", webhook.id, { 
        is_active: !webhook.is_active ? 1 : 0 
      });
      toast.success(`Webhook ${!webhook.is_active ? 'activated' : 'deactivated'}`);
      fetchWebhooks();
    } catch (error: any) {
      console.error("Error toggling webhook:", error);
      toast.error("Failed to update webhook");
    }
  };

  const handleTestWebhook = async (webhook: ZapierWebhook) => {
    try {
      setLoading(true);
      
      // Create test payload
      const testPayload = {
        source_id: "test_webhook",
        borrower_first_name: "Test",
        borrower_last_name: "User",
        borrower_email: "test@example.com",
        borrower_phone: "555-123-4567",
        borrower_date_of_birth: "1990-01-01",
        borrower_address: "123 Test St",
        borrower_city: "Test City",
        borrower_state: "CA",
        borrower_postal_code: "12345",
        property_value: "500000",
        property_type: "SINGLE_FAMILY_DETACHED",
        property_occupancy: "PrimaryResidence",
        current_mortgage_balance: "300000",
        current_interest_rate: "6.5",
        refinance_type: "Rate and Term",
        credit_score_range: "720-739",
        annual_income: "100000",
        monthly_debt_payments: "2000"
      };

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success("Test webhook sent successfully! Check your Zapier history.");
      } else {
        toast.error(`Test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("Error testing webhook:", error);
      toast.error("Failed to test webhook. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && webhooks.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Zapier Configuration</h2>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage Zapier webhook URLs that receive form submissions.
        </p>

      {accessLevel !== 'operation' && (
        <Alert className="mb-6">
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            <strong>About this integration:</strong>
            <p className="mt-2 text-sm">
              When a qualification form is submitted, data is automatically sent to the configured webhook URLs below
              with the following field structure:
            </p>
            <div className="mt-3 text-xs space-y-1 font-mono bg-muted/50 p-3 rounded">
              <div><strong>Borrower Info:</strong> borrower_first_name, borrower_last_name, borrower_email, borrower_phone, borrower_date_of_birth</div>
              <div><strong>Address:</strong> borrower_address, borrower_city, borrower_state, borrower_postal_code</div>
              <div><strong>Property:</strong> property_value, property_type, property_occupancy</div>
              <div><strong>Loan:</strong> current_mortgage_balance, current_interest_rate, refinance_type</div>
              <div><strong>Financial:</strong> annual_income, credit_score_range, monthly_debt_payments</div>
              <div><strong>Source:</strong> source_id</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Webhooks List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Configured Webhooks ({webhooks.length})</h3>
        
        {webhooks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No webhooks configured. Contact your administrator to set up Zapier integration.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-sm">
                        {webhook.webhook_name || "Webhook"}
                      </p>
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground font-mono break-all">
                        {webhook.webhook_url}
                      </p>
                    </div>
                    {webhook.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {webhook.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(webhook)}
                      title={webhook.is_active ? "Deactivate" : "Activate"}
                    >
                      <Switch checked={webhook.is_active} className="pointer-events-none" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                      className="gap-1"
                      title="Test webhook"
                    >
                      <TestTube className="h-3 w-3" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(webhook.webhook_url, webhook.id)}
                      className="gap-1"
                    >
                      {copiedId === webhook.id ? (
                        <>
                          <CheckCheck className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(webhook)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {editingWebhook ? 'Edit Webhook' : 'Add New Webhook'}
          </DialogTitle>
          <DialogDescription>
            Configure a Zapier webhook to receive form submission data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="webhook_url">Webhook URL *</Label>
            <Input
              id="webhook_url"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              className={formData.webhook_url && !validateWebhookUrl(formData.webhook_url) ? "border-red-500" : ""}
            />
            {formData.webhook_url && !validateWebhookUrl(formData.webhook_url) && (
              <p className="text-sm text-red-500">
                Please enter a valid Zapier webhook URL (must start with https://hooks.zapier.com/)
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="webhook_name">Webhook Name</Label>
            <Input
              id="webhook_name"
              placeholder="My Zapier Integration"
              value={formData.webhook_name}
              onChange={(e) => setFormData({ ...formData, webhook_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this webhook does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveWebhook} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};
