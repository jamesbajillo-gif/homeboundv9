import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVICI } from "@/contexts/VICIContext";
import { Copy, Check, RefreshCw, ArrowLeft, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { VICILeadData } from "@/lib/vici-parser";
import { SettingsCampaignSelector } from "@/components/settings/SettingsCampaignSelector";

// All possible VICI parameters organized by category
const VICI_PARAMETERS = {
  "Core Lead Info": [
    { key: "lead_id", description: "Unique lead identifier", required: true },
    { key: "first_name", description: "Customer first name", required: true },
    { key: "last_name", description: "Customer last name", required: true },
    { key: "fullname", description: "Agent name", required: false },
    { key: "phone_number", description: "Primary phone number", required: true },
    { key: "alt_phone", description: "Alternate phone number", required: false },
    { key: "email", description: "Email address", required: false },
    { key: "date_of_birth", description: "Date of birth", required: false },
    { key: "age", description: "Age", required: false },
  ],
  "Address Info": [
    { key: "address1", description: "Street address line 1", required: false },
    { key: "address2", description: "Street address line 2", required: false },
    { key: "address3", description: "Street address line 3", required: false },
    { key: "city", description: "City", required: false },
    { key: "state", description: "State/Province", required: false },
    { key: "province", description: "Province (alternative)", required: false },
    { key: "postal_code", description: "ZIP/Postal code", required: false },
  ],
  "Call Info": [
    { key: "call_id", description: "Unique call identifier", required: false },
    { key: "user", description: "Agent username", required: false },
    { key: "user_group", description: "Agent user group", required: false },
    { key: "user_code", description: "User code", required: false },
    { key: "channel_group", description: "Channel group", required: false },
    { key: "list_id", description: "List ID for script selection", required: false },
    { key: "entry_list_id", description: "Entry list ID", required: false },
    { key: "entry_date", description: "Entry date", required: false },
  ],
  "Tracking Info": [
    { key: "vendor_lead_code", description: "Vendor lead code", required: false },
    { key: "source_id", description: "Source identifier", required: false },
    { key: "citizens_lead_id", description: "Citizens lead ID", required: false },
    { key: "jornaya_id", description: "Jornaya ID", required: false },
    { key: "trusted_form_id", description: "Trusted form ID", required: false },
  ],
  "DID Info": [
    { key: "did_pattern", description: "DID pattern", required: false },
    { key: "did_description", description: "DID description", required: false },
  ],
  "Custom Fields": [
    { key: "security_phrase", description: "Security phrase/comments", required: false },
    { key: "ip", description: "IP address", required: false },
    { key: "srcsubid", description: "Source sub ID", required: false },
    { key: "test", description: "Test flag", required: false },
    { key: "ts", description: "Timestamp", required: false },
    { key: "url", description: "URL", required: false },
    { key: "wls", description: "WLS parameter", required: false },
    { key: "lpid", description: "LP ID", required: false },
    { key: "user_agent", description: "User agent", required: false },
  ],
};

// Get all known parameter keys
const getAllKnownParameterKeys = (): Set<string> => {
  const keys = new Set<string>();
  Object.values(VICI_PARAMETERS).forEach(category => {
    category.forEach(param => keys.add(param.key));
  });
  return keys;
};

// Custom field record interface
interface CustomFieldRecord {
  field_name: string;
  first_seen: string;
  last_seen: string;
  sample_values: string[];
  usage_count: number;
}

const STORAGE_KEY = 'tmdebt_vici_custom_fields';

export default function VICISettings() {
  const navigate = useNavigate();
  const { leadData, isVICIMode, refreshLeadData } = useVICI();
  const [copied, setCopied] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, CustomFieldRecord>>({});

  // Get all known parameter keys
  const knownKeys = useMemo(() => getAllKnownParameterKeys(), []);

  // Detect and store custom fields
  useEffect(() => {
    if (!isVICIMode || Object.keys(leadData).length === 0) return;

    // Load existing custom fields from localStorage
    const loadCustomFields = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as Record<string, CustomFieldRecord>;
        }
      } catch (error) {
        console.error('Error loading custom fields:', error);
      }
      return {};
    };

    // Find custom fields (fields not in known parameters)
    const currentCustomFields = { ...loadCustomFields() };
    const now = new Date().toISOString();

    Object.keys(leadData).forEach(key => {
      if (!knownKeys.has(key) && leadData[key]) {
        const value = leadData[key] || '';
        
        if (!currentCustomFields[key]) {
          // New custom field discovered
          currentCustomFields[key] = {
            field_name: key,
            first_seen: now,
            last_seen: now,
            sample_values: [value],
            usage_count: 1,
          };
        } else {
          // Update existing custom field
          const existing = currentCustomFields[key];
          existing.last_seen = now;
          existing.usage_count += 1;
          
          // Add sample value if it's new and we have space
          if (!existing.sample_values.includes(value) && existing.sample_values.length < 5) {
            existing.sample_values.push(value);
          }
        }
      }
    });

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCustomFields));
      setCustomFields(currentCustomFields);
    } catch (error) {
      console.error('Error saving custom fields:', error);
    }
  }, [leadData, isVICIMode, knownKeys]);

  // Generate the iframe URL with the current domain
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  
  // Build iframe URL with all parameters
  const buildIframeUrl = () => {
    const params = Object.values(VICI_PARAMETERS)
      .flat()
      .map(param => `${param.key}=--A--${param.key}--B--`)
      .join('&');
    return `${currentDomain}/?${params}`;
  };

  const iframeUrl = buildIframeUrl();
  const iframeCode = `<iframe src="${iframeUrl}" scrolling="auto" frameborder="0" allowtransparency="true" id="popupFrame" name="popupFrame" width="--A--script_width--B--" height="--A--script_height--B--" style="z-index:17"></iframe>`;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formatValue = (value: string | undefined): string => {
    if (!value) return "(empty)";
    if (value.length > 50) return value.substring(0, 50) + "...";
    return value;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Campaign Selector - At the very top */}
      <SettingsCampaignSelector />
      
      <div className="flex-none bg-background border-b p-4 sm:p-6 lg:px-8 lg:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              title="Back to Settings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">VICI Settings</h1>
            </div>
          </div>
          {isVICIMode && (
            <Button onClick={refreshLeadData} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>VICI Integration Status</CardTitle>
                    <CardDescription>
                      Current connection status and lead data availability
                    </CardDescription>
                  </div>
                  <Badge variant={isVICIMode ? "default" : "secondary"} className="text-sm">
                    {isVICIMode ? "Active" : "Not Connected"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isVICIMode ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      ✓ Successfully receiving lead data from VICI dialer
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(leadData).length} parameter(s) received
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No VICI data detected. Make sure this page is loaded in a VICI iframe with proper URL parameters.
                  </p>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="parameters" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="current">Current Data</TabsTrigger>
                <TabsTrigger value="custom">
                  Custom Fields
                  {Object.keys(customFields).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.keys(customFields).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
              </TabsList>

              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>VICI Parameters Reference</CardTitle>
                    <CardDescription>
                      All available parameters that can be passed from Vicidial to this application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-6">
                        {Object.entries(VICI_PARAMETERS).map(([category, params]) => (
                          <div key={category}>
                            <h3 className="text-lg font-semibold mb-3">{category}</h3>
                            <div className="space-y-2">
                              {params.map((param) => {
                                const isPresent = isVICIMode && leadData.hasOwnProperty(param.key);
                                return (
                                  <div
                                    key={param.key}
                                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <code className="text-sm font-mono font-semibold">
                                          {param.key}
                                        </code>
                                        {param.required && (
                                          <Badge variant="destructive" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                        {isPresent && (
                                          <Badge variant="default" className="text-xs">
                                            Active
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {param.description}
                                      </p>
                                      {isPresent && (
                                        <p className="text-xs text-primary mt-1">
                                          Current value: {formatValue(leadData[param.key])}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Current Data Tab */}
              <TabsContent value="current" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Lead Data</CardTitle>
                    <CardDescription>
                      Real-time VICI parameters received in the current session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isVICIMode && Object.keys(leadData).length > 0 ? (
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-2">
                          {Object.entries(leadData).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-mono font-semibold">{key}</code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopy(value || "", key)}
                                  >
                                    {copied === key ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm font-mono break-all text-muted-foreground">
                                  {value || "(empty)"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          No VICI data available. Load this page in a VICI iframe to see data.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent value="custom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Custom Fields</CardTitle>
                        <CardDescription>
                          Parameters passed from VICI that are not part of the default parameter list
                        </CardDescription>
                      </div>
                      {Object.keys(customFields).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to clear all custom field records?')) {
                              localStorage.removeItem(STORAGE_KEY);
                              setCustomFields({});
                              toast.success('Custom fields cleared');
                            }
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(customFields).length > 0 ? (
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-3">
                          {Object.values(customFields)
                            .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
                            .map((field) => {
                              const isCurrentlyActive = isVICIMode && leadData[field.field_name];
                              return (
                                <Card key={field.field_name} className={isCurrentlyActive ? "border-primary" : ""}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <code className="text-base font-mono font-semibold">
                                            {field.field_name}
                                          </code>
                                          {isCurrentlyActive && (
                                            <Badge variant="default" className="text-xs">
                                              Active Now
                                            </Badge>
                                          )}
                                          <Badge variant="outline" className="text-xs">
                                            Used {field.usage_count} time{field.usage_count !== 1 ? 's' : ''}
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                          <div>
                                            <span className="font-medium">First Seen:</span>{' '}
                                            {new Date(field.first_seen).toLocaleString()}
                                          </div>
                                          <div>
                                            <span className="font-medium">Last Seen:</span>{' '}
                                            {new Date(field.last_seen).toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                      {isCurrentlyActive && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleCopy(leadData[field.field_name] || "", field.field_name)}
                                        >
                                          {copied === field.field_name ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {isCurrentlyActive && (
                                      <div className="mb-3 p-2 bg-primary/10 rounded text-sm">
                                        <span className="font-medium">Current Value:</span>{' '}
                                        <code className="font-mono break-all">
                                          {leadData[field.field_name] || "(empty)"}
                                        </code>
                                      </div>
                                    )}
                                    {field.sample_values.length > 0 && (
                                      <div>
                                        <Label className="text-xs mb-2 block">Sample Values:</Label>
                                        <div className="space-y-1">
                                          {field.sample_values.map((value, idx) => (
                                            <div
                                              key={idx}
                                              className="p-2 bg-muted rounded text-xs font-mono break-all"
                                            >
                                              {value || "(empty)"}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground mb-2">
                          No custom fields discovered yet.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Custom fields will be automatically detected and recorded when VICI passes parameters
                          that are not part of the default parameter list.
                        </p>
                        {!isVICIMode && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Load this page in a VICI iframe to start detecting custom fields.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Setup Tab */}
              <TabsContent value="setup" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>VICI Integration Setup</CardTitle>
                    <CardDescription>
                      Instructions and code snippets for integrating with Vicidial
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base mb-2 block">Step 1: Copy Iframe Code</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Copy this iframe code and paste it into your VICI campaign settings.
                      </p>
                      <div className="relative">
                        <Input
                          value={iframeCode}
                          readOnly
                          className="font-mono text-xs pr-10"
                        />
                        <Button
                          onClick={() => handleCopy(iframeCode, "Iframe code")}
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1 h-7 w-7"
                        >
                          {copied === "Iframe code" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base mb-2 block">Step 2: Configure VICI Campaign</Label>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Log into your VICI admin panel</li>
                        <li>Navigate to Campaign Settings</li>
                        <li>Find the "Script" or "Web Form" section</li>
                        <li>Paste the iframe code above</li>
                        <li>Save your campaign settings</li>
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base mb-2 block">Step 3: Iframe URL (Reference)</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        This is the URL that will be used in the iframe. All parameters use VICI placeholders.
                      </p>
                      <div className="relative">
                        <Input
                          value={iframeUrl}
                          readOnly
                          className="font-mono text-xs pr-10"
                        />
                        <Button
                          onClick={() => handleCopy(iframeUrl, "Iframe URL")}
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1 h-7 w-7"
                        >
                          {copied === "Iframe URL" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Field Mappings Tab */}
              <TabsContent value="mappings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>VICI Field Mappings</CardTitle>
                    <CardDescription>
                      How VICI parameters map to application fields and script placeholders
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Script Placeholder Mappings</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            These placeholders in scripts are automatically replaced with VICI data:
                          </p>
                          <div className="space-y-2">
                            {[
                              { placeholder: "[Name]", fields: ["first_name", "firstname"] },
                              { placeholder: "[First Name]", fields: ["first_name", "firstname"] },
                              { placeholder: "[Last Name]", fields: ["last_name", "lastname"] },
                              { placeholder: "[Customer Name]", fields: ["first_name", "firstname"] },
                              { placeholder: "[Your Name]", fields: ["fullname", "agent_name"] },
                              { placeholder: "[Agent Name]", fields: ["fullname", "agent_name"] },
                              { placeholder: "[Company]", fields: ["company", "company_name"] },
                              { placeholder: "[State]", fields: ["address3"] },
                              { placeholder: "[City]", fields: ["city"] },
                              { placeholder: "[Phone]", fields: ["phone_number", "phone"] },
                              { placeholder: "[Email]", fields: ["email", "email_address"] },
                              { placeholder: "[Address]", fields: ["address1", "address"] },
                              { placeholder: "[Zip]", fields: ["postal_code", "zip", "zipcode"] },
                            ].map((mapping) => (
                              <div key={mapping.placeholder} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-mono font-semibold">
                                    {mapping.placeholder}
                                  </code>
                                  <span className="text-muted-foreground">→</span>
                                  <div className="flex gap-1">
                                    {mapping.fields.map((field, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {field}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Maps to VICI fields (tried in order)
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-semibold mb-3">Form Field Mappings</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            VICI data automatically populates qualification form fields:
                          </p>
                          <div className="space-y-2">
                            {[
                              { form: "borrower_first_name", vici: "first_name" },
                              { form: "borrower_last_name", vici: "last_name" },
                              { form: "customer_email", vici: "email" },
                              { form: "borrower_phone", vici: "phone_number" },
                              { form: "borrower_date_of_birth", vici: "date_of_birth" },
                              { form: "borrower_address", vici: "address1" },
                              { form: "borrower_city", vici: "city" },
                              { form: "borrower_state", vici: "state" },
                              { form: "borrower_postal_code", vici: "postal_code" },
                            ].map((mapping) => (
                              <div key={mapping.form} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono">{mapping.form}</code>
                                  <span className="text-muted-foreground">←</span>
                                  <Badge variant="outline" className="text-xs">
                                    {mapping.vici}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

