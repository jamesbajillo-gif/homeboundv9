import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useVICI } from "@/contexts/VICIContext";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const VICIConfiguration = () => {
  const { leadData, isVICIMode, refreshLeadData } = useVICI();
  const [copied, setCopied] = useState(false);

  // Generate the iframe URL with the current domain
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const iframeUrl = `${currentDomain}/?user=--A--user--B--&lead_id=--A--lead_id--B--&first_name=--A--first_name--B--&last_name=--A--last_name--B--&phone_number=--A--phone_number--B--&fullname=--A--fullname--B--&city=--A--city--B--&state=--A--state--B--&province=--A--province--B--&postal_code=--A--postal_code--B--&channel_group=--A--channel_group--B--&user_group=--A--user_group--B--&email=--A--email--B--&date_of_birth=--A--date_of_birth--B--&vendor_lead_code=--A--vendor_lead_code--B--&source_id=--A--source_id--B--&address2=--A--address2--B--&address3=--A--address3--B--&list_id=--A--list_id--B--&entry_list_id=--A--entry_list_id--B--&security_phrase=--A--comments--B--&entry_date=--A--entry_date--B--&age=--A--age--B--&address1=--A--address1--B--&alt_phone=--A--alt_phone--B--&call_id=--A--call_id--B--&did_pattern=--A--did_pattern--B--&did_description=--A--did_description--B--`;

  const iframeCode = `<iframe src="${iframeUrl}" scrolling="auto" frameborder="0" allowtransparency="true" id="popupFrame" name="popupFrame" width="--A--script_width--B--" height="--A--script_height--B--" style="z-index:17"></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      toast.success("Iframe code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">VICI Integration Status</h3>
          <Badge variant={isVICIMode ? "default" : "secondary"}>
            {isVICIMode ? "Active" : "Not Connected"}
          </Badge>
        </div>

        {isVICIMode ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Successfully receiving lead data from VICI dialer.
            </p>
            <Button onClick={refreshLeadData} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Lead Data
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No VICI data detected. Make sure this page is loaded in a VICI iframe with proper URL parameters.
          </p>
        )}
      </Card>

      {/* Setup Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base">Step 1: Copy Iframe Code</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Copy this iframe code and paste it into your VICI campaign settings.
            </p>
            <div className="relative">
              <Input
                value={iframeCode}
                readOnly
                className="font-mono text-xs pr-10"
              />
              <Button
                onClick={handleCopy}
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-7 w-7"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base">Step 2: Configure VICI Campaign</Label>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mt-2">
              <li>Log into your VICI admin panel</li>
              <li>Navigate to Campaign Settings</li>
              <li>Find the "Script" or "Web Form" section</li>
              <li>Paste the iframe code above</li>
              <li>Save your campaign settings</li>
            </ol>
          </div>

          <Separator />

          <div>
            <Label className="text-base">Step 3: Field Mapping</Label>
            <p className="text-sm text-muted-foreground mb-2">
              The system automatically captures these VICI fields:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                'lead_id', 'first_name', 'last_name', 'phone_number', 'email',
                'city', 'state', 'postal_code', 'address1', 'date_of_birth',
                'call_id', 'user_group', 'list_id', 'alt_phone', 'age'
              ].map(field => (
                <Badge key={field} variant="outline" className="justify-center">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Current Lead Data */}
      {isVICIMode && Object.keys(leadData).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Lead Data</h3>
          <div className="space-y-2 text-sm font-mono">
            {Object.entries(leadData).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-medium break-all">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
