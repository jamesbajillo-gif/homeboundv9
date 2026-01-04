import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Keyboard, FileText, Settings2, Zap, FormInput, PhoneIncoming, PhoneOutgoing, ListOrdered, Database, Phone, Puzzle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { DEFAULT_DB_CONFIG } from "@/lib/mysqlApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SettingsCampaignSelector } from "@/components/settings/SettingsCampaignSelector";

const Settings = () => {
  const navigate = useNavigate();
  const [debugMode, setDebugMode] = useState(false);
  const [accessLevel, setAccessLevel] = useState('kainkatae');
  const [loading, setLoading] = useState(true);

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load debug mode from API, fallback to localStorage for backward compatibility
        const apiDebugMode = await getAppSetting('tmdebt_debug_mode');
        const localDebugMode = localStorage.getItem('tmdebt_debug_mode');
        const debugValue = apiDebugMode || localDebugMode || 'false';
        setDebugMode(debugValue === 'true');

        // Load access level from localStorage (security-sensitive, keep in localStorage)
        const localAccessLevel = localStorage.getItem('tmdebt_settings_access_level') || 'kainkatae';
        setAccessLevel(localAccessLevel);
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to localStorage
        setDebugMode(localStorage.getItem('tmdebt_debug_mode') === 'true');
        setAccessLevel(localStorage.getItem('tmdebt_settings_access_level') || 'kainkatae');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Show keyboard shortcuts info on first visit
  useEffect(() => {
    const checkShortcuts = async () => {
      try {
        const hasSeenShortcuts = await getAppSetting('tmdebt_seen_keyboard_shortcuts');
        const localHasSeen = localStorage.getItem('tmdebt_seen_keyboard_shortcuts');
        
        if (!hasSeenShortcuts && !localHasSeen) {
          setTimeout(async () => {
            toast.info('Keyboard Shortcuts', {
              description: 'Ctrl+K: Open Settings • Ctrl+S: Save • Ctrl+X: Close',
              duration: 5000,
            });
            // Save to both API and localStorage for backward compatibility
            try {
              await setAppSetting('tmdebt_seen_keyboard_shortcuts', 'true', 'boolean', 'Whether user has seen keyboard shortcuts');
            } catch (error) {
              console.error('Error saving shortcuts to API:', error);
            }
            localStorage.setItem('tmdebt_seen_keyboard_shortcuts', 'true');
          }, 500);
        }
      } catch (error) {
        console.error('Error checking shortcuts:', error);
        // Fallback to localStorage
        const hasSeenShortcuts = localStorage.getItem('tmdebt_seen_keyboard_shortcuts');
        if (!hasSeenShortcuts) {
          setTimeout(() => {
            toast.info('Keyboard Shortcuts', {
              description: 'Ctrl+K: Open Settings • Ctrl+S: Save • Ctrl+X: Close',
              duration: 5000,
            });
            localStorage.setItem('tmdebt_seen_keyboard_shortcuts', 'true');
          }, 500);
        }
      }
    };

    checkShortcuts();
  }, []);

  const handleDebugToggle = async (checked: boolean) => {
    setDebugMode(checked);
    try {
      // Save to both API and localStorage for backward compatibility
      await setAppSetting('tmdebt_debug_mode', checked.toString(), 'boolean', 'Debug mode toggle');
      localStorage.setItem('tmdebt_debug_mode', checked.toString());
      window.dispatchEvent(new Event('debug-mode-change'));
    } catch (error) {
      console.error('Error saving debug mode:', error);
      // Fallback to localStorage only
      localStorage.setItem('tmdebt_debug_mode', checked.toString());
      window.dispatchEvent(new Event('debug-mode-change'));
    }
  };

  const settingsCategories = [
    {
      title: "Call Script Settings",
      description: "Manage your call scripts for different scenarios",
      icon: FileText,
      items: [
        { 
          name: "Inbound Scripts", 
          icon: PhoneIncoming,
          description: "Edit inbound call scripts",
          path: "/settings/inbound"
        },
        { 
          name: "Outbound Scripts", 
          icon: PhoneOutgoing,
          description: "Edit outbound call scripts",
          path: "/settings/outbound"
        },
        { 
          name: "Forms", 
          icon: FormInput,
          description: "Configure qualification forms",
          path: "/settings/forms"
        },
        { 
          name: "List ID", 
          icon: ListOrdered,
          description: "Manage List IDs and their scripts",
          path: "/settings/listid"
        },
      ]
    },
    {
      title: "Modules",
      description: "Integration modules and extensions",
      icon: Puzzle,
      items: [
        { 
          name: "VICI", 
          icon: Phone,
          description: "Review and configure VICI parameters and data",
          path: "/settings/vici"
        },
      ]
    },
    {
      title: "Adv Configuration",
      description: "Advanced integration and automation settings",
      icon: Settings2,
      items: [
        { 
          name: "Zapier", 
          icon: Zap,
          description: "Manage Zapier webhook integrations",
          path: "/settings/zapier"
        },
        { 
          name: "Campaign Mapping", 
          icon: Database,
          description: "Map campaign variables to campaign prefixes",
          path: "/settings/campaign-mapping"
        },
        { 
          name: "Campaign Diagnostics", 
          icon: Database,
          description: "Diagnose and manage campaign tables and data",
          path: "/settings/campaign-diagnostics"
        },
        { 
          name: "Admin Configuration", 
          icon: Shield,
          description: "Manage admin users with full access across all campaigns",
          path: "/settings/admin-config"
        },
      ]
    },
  ];

  const handleNavigation = (item: any) => {
    if (item.action === "debug-toggle") {
      handleDebugToggle(!debugMode);
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
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
              onClick={() => navigate("/")}
              title="Back to Home (Ctrl+X)"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <div className="flex items-center gap-2 ml-4">
              <Checkbox 
                id="debug-mode"
                checked={debugMode}
                onCheckedChange={handleDebugToggle}
              />
              <Label htmlFor="debug-mode" className="text-sm cursor-pointer">
                Debug
              </Label>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.info('Keyboard Shortcuts', {
                description: 'Ctrl+K: Open Settings • Ctrl+S: Save Changes • Ctrl+X: Close Settings',
                duration: 5000,
              });
            }}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {settingsCategories
              .filter((category) => {
                // Hide "Adv Configuration" for "operation" password
                if (accessLevel === 'operation') {
                  return category.title !== 'Adv Configuration';
                }
                return true;
              })
              .map((category) => (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {category.items.map((item) => (
                    <Card 
                      key={item.name}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] group"
                      onClick={() => handleNavigation(item)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <item.icon className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {/* MySQL Connection Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">MySQL Connection</h2>
                  <p className="text-xs text-muted-foreground">Current database configuration</p>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Host:</span>
                        <span className="ml-2 font-mono">{DEFAULT_DB_CONFIG.sqlhost}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Port:</span>
                        <span className="ml-2 font-mono">{DEFAULT_DB_CONFIG.sqlport}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Database:</span>
                        <span className="ml-2 font-mono">{DEFAULT_DB_CONFIG.sqldb}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Username:</span>
                        <span className="ml-2 font-mono">{DEFAULT_DB_CONFIG.sqlun}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Password:</span>
                        <span className="ml-2 font-mono">••••••••</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Charset:</span>
                        <span className="ml-2 font-mono">{DEFAULT_DB_CONFIG.sqlcharset}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">API Endpoint:</span>
                        <span className="ml-2 font-mono text-xs break-all">https://api.techpinoy.net/mysqlapi.php</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;
