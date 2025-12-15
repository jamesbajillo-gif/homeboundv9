import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Keyboard, FileText, Settings2, Users, Palette, Zap, FormInput, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('debug_mode') === 'true');
  const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';

  const handleDebugToggle = (checked: boolean) => {
    setDebugMode(checked);
    localStorage.setItem('debug_mode', checked.toString());
    window.dispatchEvent(new Event('debug-mode-change'));
  };

  // Show keyboard shortcuts info on first visit
  useEffect(() => {
    const hasSeenShortcuts = localStorage.getItem('seen_keyboard_shortcuts');
    if (!hasSeenShortcuts) {
      setTimeout(() => {
        toast.info('Keyboard Shortcuts', {
          description: 'Ctrl+K: Open Settings • Ctrl+S: Save • Ctrl+X: Close',
          duration: 5000,
        });
        localStorage.setItem('seen_keyboard_shortcuts', 'true');
      }, 500);
    }
  }, []);

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
      ]
    },
    {
      title: "User Settings",
      description: "Manage user groups and permissions",
      icon: Users,
      items: [
        { 
          name: "User Groups", 
          icon: Users,
          description: "Configure user group settings",
          path: "/settings/users"
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;
