import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVICI } from "@/contexts/VICIContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { GroupToggle } from "@/components/GroupToggle";
import { formatInTimeZone } from "date-fns-tz";
import { getAppSetting, setAppSetting } from "@/lib/migration";

type CallStatus = "active" | "idle";

export const FloatingCallHeader = () => {
  const [callStatus] = useState<CallStatus>("active");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [debugMode, setDebugMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { leadData } = useVICI();

  // Load debug mode from API on mount
  useEffect(() => {
    const loadDebugMode = async () => {
      try {
        // Try API first, fallback to localStorage
        const apiDebugMode = await getAppSetting('tmdebt_debug_mode');
        const localDebugMode = localStorage.getItem('tmdebt_debug_mode');
        const debugValue = apiDebugMode || localDebugMode || 'false';
        setDebugMode(debugValue === 'true');
      } catch (error) {
        console.error('Error loading debug mode:', error);
        // Fallback to localStorage
        setDebugMode(localStorage.getItem('tmdebt_debug_mode') === 'true');
      }
    };

    loadDebugMode();

    // Listen for debug mode changes from Settings page
    const handleDebugChange = () => {
      const localDebugMode = localStorage.getItem('tmdebt_debug_mode');
      setDebugMode(localDebugMode === 'true');
    };

    window.addEventListener('debug-mode-change', handleDebugChange);
    return () => window.removeEventListener('debug-mode-change', handleDebugChange);
  }, []);

  // Get customer info from VICI lead data
  // Build customer name from first_name + last_name (NOT fullname, which is agent)
  let customerName = 'Unknown';
  
  const firstName = (leadData.first_name && leadData.first_name !== '--A--first_name--B--') ? leadData.first_name : '';
  const lastName = (leadData.last_name && leadData.last_name !== '--A--last_name--B--') ? leadData.last_name : '';
  const combined = `${firstName} ${lastName}`.trim();
  if (combined) {
    customerName = combined;
  }
  
  const phoneNumber = (leadData.phone_number && leadData.phone_number !== '--A--phone_number--B--') 
    ? leadData.phone_number 
    : 'No phone';
  const email = (leadData.email && leadData.email !== '--A--email--B--') ? leadData.email : undefined;
  const address = (leadData.address3 && leadData.address3 !== '--A--address3--B--') 
    ? leadData.address3 
    : undefined;
  const address1 = (leadData.address1 && leadData.address1 !== '--A--address1--B--') ? leadData.address1 : undefined;
  const city = (leadData.city && leadData.city !== '--A--city--B--') ? leadData.city : undefined;
  const state = (leadData.state && leadData.state !== '--A--state--B--') ? leadData.state : undefined;
  const postalCode = (leadData.postal_code && leadData.postal_code !== '--A--postal_code--B--') ? leadData.postal_code : undefined;
  const leadId = (leadData.lead_id && leadData.lead_id !== '--A--lead_id--B--') ? leadData.lead_id : undefined;
  const sourceId = (leadData.source_id && leadData.source_id !== '--A--source_id--B--') ? leadData.source_id : undefined;
  const listId = (leadData.list_id && leadData.list_id !== '--A--list_id--B--') ? leadData.list_id : undefined;
  const channelGroup = (leadData.channel_group && leadData.channel_group !== '--A--channel_group--B--') ? leadData.channel_group : undefined;
  const mortgageBalance = (leadData.mortgage_balance && leadData.mortgage_balance !== '--A--mortgage_balance--B--') ? leadData.mortgage_balance : undefined;

  // Update date and time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentDate = () => {
    return formatInTimeZone(currentTime, 'America/Los_Angeles', 'MMM dd, yyyy');
  };

  const getPSTTime = () => {
    return formatInTimeZone(currentTime, 'America/Los_Angeles', 'h:mm:ss a');
  };


  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-header animate-fade-in">
        {/* Main Header Row - Clickable */}
        <div 
          className={cn(
            "max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 cursor-pointer transition-colors",
            "hover:bg-muted/50",
            isExpanded && "bg-muted/30"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between h-12 md:h-14 gap-2 sm:gap-3 md:gap-4">
            {/* Call Status & Info - Left Side */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-1 md:gap-1.5">
                <div
                  className={cn(
                    "w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-pulse",
                    callStatus === "active" && "bg-call-active",
                    callStatus === "idle" && "bg-muted-foreground"
                  )}
                />
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium text-xs md:text-sm",
                    callStatus === "active" && "border-call-active text-call-active"
                  )}
                >
                  {callStatus === "active" && "Active Call"}
                  {callStatus === "idle" && "No Active Call"}
                </Badge>
              </div>

              {callStatus !== "idle" && (
                <>
                  <div className="h-4 md:h-5 w-px bg-border" />
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-0 text-xs sm:text-sm md:text-base">
                    <span className="font-medium text-foreground truncate max-w-[80px] sm:max-w-[160px] md:max-w-[240px]">{customerName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground truncate">{phoneNumber}</span>
                    {address && (
                      <>
                        <span className="text-muted-foreground hidden md:inline">•</span>
                        <span className="text-muted-foreground truncate hidden md:inline">{address}</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Date/Time and Group Toggle - Right Side */}
            {callStatus !== "idle" && (
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <GroupToggle />
                <div className="h-4 md:h-5 w-px bg-border" />
                <div className="flex flex-col items-end">
                  <div className="text-xs sm:text-sm md:text-base font-medium text-foreground">{getCurrentDate()}</div>
                  <div className="text-[10px] md:text-xs font-mono text-muted-foreground">{getPSTTime()} PST</div>
                </div>
                {/* Expand/Collapse Icon */}
                <div className="h-4 md:h-5 w-px bg-border" />
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Rows - Two Additional Rows */}
        {isExpanded && callStatus !== "idle" && (
          <div className="border-t border-border bg-muted/20">
            <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-3 space-y-2 md:space-y-3">
              {/* First Additional Row - Always Visible */}
              <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground min-h-[20px] md:min-h-[24px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-foreground">Email:</span>
                  <span className="truncate">{email || 'Not provided'}</span>
                </div>
                {leadId && (
                  <>
                    <div className="h-3 md:h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-medium text-foreground">Lead ID:</span>
                      <span>{leadId}</span>
                    </div>
                  </>
                )}
                {sourceId && (
                  <>
                    <div className="h-3 md:h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-medium text-foreground">Source:</span>
                      <span>{sourceId}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Second Additional Row - Always Visible */}
              <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground min-h-[20px] md:min-h-[24px]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-medium text-foreground">Address:</span>
                  <span className="truncate">
                    {[address1, city, state, postalCode].filter(Boolean).join(', ') || 'Not provided'}
                  </span>
                </div>
                {listId && (
                  <>
                    <div className="h-3 md:h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-medium text-foreground">List ID:</span>
                      <span>{listId}</span>
                    </div>
                  </>
                )}
                {channelGroup && (
                  <>
                    <div className="h-3 md:h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-medium text-foreground">Channel:</span>
                      <span>{channelGroup}</span>
                    </div>
                  </>
                )}
                {mortgageBalance && (
                  <>
                    <div className="h-3 md:h-4 w-px bg-border" />
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-medium text-foreground">Mortgage Balance:</span>
                      <span>{mortgageBalance}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    {/* Debug Panel */}
    {debugMode && (
      <div className="fixed top-14 right-2 z-40 p-3 max-h-[450px] overflow-y-auto max-w-md">
        <div className="text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-foreground">🐛 Debug Mode - Lead Data</div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={async () => {
                try {
                  await setAppSetting('tmdebt_debug_mode', 'false', 'boolean', 'Debug mode toggle');
                } catch (error) {
                  console.error('Error saving debug mode:', error);
                }
                localStorage.setItem('tmdebt_debug_mode', 'false');
                setDebugMode(false);
                window.dispatchEvent(new Event('debug-mode-change'));
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <pre className="p-2 rounded text-[10px] overflow-x-auto text-foreground">
{JSON.stringify({
  "user": leadData.user || "800",
  "lead_id": leadData.lead_id || "1234",
  "first_name": leadData.first_name || "JOHN",
  "last_name": leadData.last_name || "PUBLIC",
  "phone_number": leadData.phone_number || "7275551212",
  "fullname": leadData.fullname || "JOE AGENT",
  "city": leadData.city || "CHICAGO",
  "state": leadData.state || "IL",
  "province": leadData.province || "PROVINCE",
  "postal_code": leadData.postal_code || "33760",
  "channel_group": leadData.channel_group || "TESTCAMP",
  "user_group": leadData.user_group || "user_group",
  "email": leadData.email || "test@test.com",
  "date_of_birth": leadData.date_of_birth || "1970-01-01",
  "vendor_lead_code": leadData.vendor_lead_code || "VENDOR:LEAD;CODE",
  "address2": leadData.address2 || "Apt. 3",
  "address3": leadData.address3 || "Apt. 3",
  "list_id": leadData.list_id || "LISTID",
  "entry_list_id": leadData.entry_list_id || "entry_list_id",
  "security_phrase": leadData.security_phrase || "COMMENTS FIELD",
  "CF_uses_custom_fields": leadData.CF_uses_custom_fields || "Y",
  "user_code": leadData.user_code || "custom one",
  "address1": leadData.address1 || "1234 Main St.",
  "alt_phone": leadData.alt_phone || "3125551111",
  "call_id": leadData.call_id || "call_id",
  "did_pattern": leadData.did_pattern || "did_pattern"
}, null, 2)}
          </pre>
        </div>
      </div>
    )}
  </>
  );
};
