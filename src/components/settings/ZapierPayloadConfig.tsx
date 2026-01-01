import { Card } from "@/components/ui/card";
import { Settings, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VICIFieldMapping {
  form_field: string;
  vici_field: string;
  fallback_value: string;
  description: string;
}

const DEFAULT_VALUES = {
  default_email: 'noemail@itsbuzzmarketing.com',
  default_birthdate: '1970-01-01',
  default_source_id: 'querystring',
  default_name_fallback: 'Not Provided',
  clean_currency: true,
};

const VICI_FIELD_MAPPINGS: VICIFieldMapping[] = [
  {
    form_field: 'borrower_first_name',
    vici_field: 'first_name',
    fallback_value: 'Not Provided',
    description: 'Uses VICI first_name, falls back to form value, then "Not Provided"'
  },
  {
    form_field: 'borrower_last_name',
    vici_field: 'last_name',
    fallback_value: 'Not Provided',
    description: 'Uses VICI last_name, falls back to form value, then "Not Provided"'
  },
  {
    form_field: 'customer_email',
    vici_field: 'email',
    fallback_value: 'noemail@itsbuzzmarketing.com',
    description: 'Uses VICI email, falls back to form value, then default email if invalid'
  },
  {
    form_field: 'borrower_phone',
    vici_field: 'phone_number',
    fallback_value: '"" (empty string)',
    description: 'Uses VICI phone_number, falls back to form value'
  },
  {
    form_field: 'borrower_date_of_birth',
    vici_field: 'date_of_birth',
    fallback_value: '1970-01-01',
    description: 'Uses VICI date_of_birth, falls back to form value, then default if invalid'
  },
  {
    form_field: 'borrower_address',
    vici_field: 'address1',
    fallback_value: '"" (empty string)',
    description: 'Uses VICI address1, falls back to form value'
  },
  {
    form_field: 'borrower_city',
    vici_field: 'city',
    fallback_value: '"" (empty string)',
    description: 'Uses VICI city, falls back to form value'
  },
  {
    form_field: 'borrower_state',
    vici_field: 'state',
    fallback_value: '"" (empty string)',
    description: 'Uses VICI state, falls back to form value'
  },
  {
    form_field: 'borrower_postal_code',
    vici_field: 'postal_code',
    fallback_value: '"" (empty string)',
    description: 'Uses VICI postal_code, falls back to form value'
  },
];

export const ZapierPayloadConfig = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Zapier Payload Configuration</h2>
        <Badge variant="outline" className="ml-2">
          <Lock className="h-3 w-3 mr-1" />
          Read Only
        </Badge>
      </div>
      <p className="text-muted-foreground mb-6">
        Current configuration for how qualification form data is processed and sent to Zapier webhooks.
      </p>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="defaults">Default Values</TabsTrigger>
          <TabsTrigger value="mappings">VICI Field Mappings</TabsTrigger>
          <TabsTrigger value="processing">Data Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="space-y-4 mt-6">
          <Alert>
            <AlertDescription>
              These default values are used when form fields or VICI data are missing or invalid.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Default Email</p>
                  <p className="text-base font-mono">{DEFAULT_VALUES.default_email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used when email is missing or invalid
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Default Birthdate</p>
                  <p className="text-base font-mono">{DEFAULT_VALUES.default_birthdate}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used when birthdate is missing or invalid (format: YYYY-MM-DD)
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Default Source ID</p>
                  <p className="text-base font-mono">{DEFAULT_VALUES.default_source_id}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used when source_id is not provided in VICI data
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Default Name Fallback</p>
                  <p className="text-base font-mono">{DEFAULT_VALUES.default_name_fallback}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used when first or last name is missing
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4 mt-6">
          <Alert>
            <AlertDescription>
              These mappings define how VICI lead data fields are mapped to form fields when building the Zapier payload.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {VICI_FIELD_MAPPINGS.map((mapping, index) => (
              <Card key={mapping.form_field} className="p-4 bg-muted/30">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Form Field: <span className="font-mono text-primary">{mapping.form_field}</span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Mapping #{index + 1}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">VICI Field</p>
                      <p className="text-sm font-mono bg-background p-2 rounded border">
                        {mapping.vici_field}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Fallback Value</p>
                      <p className="text-sm font-mono bg-background p-2 rounded border">
                        {mapping.fallback_value}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-xs text-muted-foreground bg-background p-2 rounded border">
                        {mapping.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4 mt-6">
          <Alert>
            <AlertDescription>
              Data processing rules applied to form data before sending to Zapier.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Currency Field Processing</p>
                  <Badge variant={DEFAULT_VALUES.clean_currency ? "default" : "secondary"}>
                    {DEFAULT_VALUES.clean_currency ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    <strong>Status:</strong> {DEFAULT_VALUES.clean_currency ? "Active" : "Inactive"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    When enabled, currency values (e.g., "$500,000") are automatically cleaned by removing 
                    dollar signs ($) and commas (,) before sending to Zapier. This converts "$500,000" to "500000".
                  </p>
                  <div className="mt-3 p-3 bg-background rounded border">
                    <p className="text-xs font-mono">
                      <strong>Example:</strong> "$500,000" → "500000"
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <p className="font-semibold">Email Validation</p>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Email addresses are validated using a standard email regex pattern. Invalid or empty emails 
                    are replaced with the default email value.
                  </p>
                  <div className="mt-2 p-3 bg-background rounded border">
                    <p className="text-xs font-mono">
                      <strong>Pattern:</strong> /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <p className="font-semibold">Date Validation</p>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Birthdates are validated to ensure they are:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>Valid date format (YYYY-MM-DD)</li>
                    <li>Between year 1900 and current year + 100</li>
                    <li>Not empty or "0000-00-00"</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Invalid dates are replaced with the default birthdate value.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <p className="font-semibold">Field Mapping Priority</p>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    For each field, the system uses the following priority order:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                    <li>VICI lead data (if available and mapped)</li>
                    <li>Form field value (user input)</li>
                    <li>Default fallback value (if configured)</li>
                    <li>Empty string ("") for most fields</li>
                  </ol>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <p className="font-semibold">Zapier Field Name Mapping</p>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Each form field can have a custom <code className="text-xs bg-background px-1 py-0.5 rounded">zapier_field_name</code> 
                    configured in the qualification form settings. If not specified, the original <code className="text-xs bg-background px-1 py-0.5 rounded">field_name</code> is used.
                  </p>
                  <div className="mt-2 p-3 bg-background rounded border">
                    <p className="text-xs font-mono">
                      <strong>Example:</strong> field_name: "borrower_first_name" → zapier_field_name: "first_name"
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};


