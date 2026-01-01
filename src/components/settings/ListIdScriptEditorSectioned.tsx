import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mysqlApi } from "@/lib/mysqlApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

interface ListIdScriptEditorSectionedProps {
  listId: string;
}

interface SectionScript {
  title: string;
  content: string;
}

const DEFAULT_QUALIFICATION_SCRIPTS: Record<string, SectionScript> = {
  personal: {
    title: "Personal Information",
    content: "(No content - fields auto-populate from VICI)"
  },
  property: {
    title: "Property Information",
    content: `Type of property (single family, condo, etc.)

Is this your Primary residence?
is this a second home or its your investment proerty that we are talking about?

Are you you looking for additional cash-out or your just looking for the lowest rate & terms?

What is your property value? what have you seen online? or have you seen any current sales in your neighbourhood?`
  },
  loan: {
    title: "Current Loan Information",
    content: `Current first mortgage balance & payment

Current second mortgage balance & payment (if applicable) (Please taker note in your end if they have and inform he Loan Officers)

What is your interest rate for this mortgage( Applicable in both First & Second Mortgage)`
  },
  financial: {
    title: "Financial Information",
    content: `What is yor annual gross income?

Approximate credit score?

Total credit obligations (credit cards, personal loans, car loans, medical debts etc.)`
  }
};

export const ListIdScriptEditorSectioned = ({ listId }: ListIdScriptEditorSectionedProps) => {
  const queryClient = useQueryClient();
  const [sectionScripts, setSectionScripts] = useState<Record<string, SectionScript>>(DEFAULT_QUALIFICATION_SCRIPTS);

  // Fetch script for this list_id with step_name='qualification'
  const { data: scriptData, isLoading } = useQuery({
    queryKey: ["list-script-sectioned", listId, "qualification"],
    queryFn: async () => {
      const data = await mysqlApi.findOneByFields<{
        id: number | string;
        list_id: string;
        step_name: string;
        title: string;
        content: string;
      }>(
        "homebound_list_id_config",
        {
          list_id: listId,
          step_name: "qualification"
        }
      );
      
      return data;
    },
    enabled: !!listId,
  });

  // Update section scripts when data loads
  useEffect(() => {
    if (scriptData && scriptData.content) {
      try {
        const parsed = JSON.parse(scriptData.content);
        if (parsed && typeof parsed === 'object' && 'personal' in parsed) {
          // Filter out test data and invalid content
          const testDataPatterns = ['mysql', 'test', 'sucess', 'success test', '--A--', 'placeholder'];
          const isValidContent = (content: string): boolean => {
            if (!content || content.trim() === "") return false;
            const contentLower = content.toLowerCase().trim();
            return !testDataPatterns.some(pattern => contentLower.includes(pattern));
          };
          
          // Clean and validate each section
          const cleanedScripts: Record<string, SectionScript> = {};
          let hasValidContent = false;
          
          for (const [key, section] of Object.entries(parsed)) {
            if (section && typeof section === 'object' && 'content' in section) {
              const sectionData = section as { content?: unknown; title?: unknown };
              const sectionContent = String(sectionData.content || '').trim();
              if (isValidContent(sectionContent)) {
                cleanedScripts[key] = {
                  title: String(sectionData.title || DEFAULT_QUALIFICATION_SCRIPTS[key as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS]?.title || ''),
                  content: sectionContent
                };
                hasValidContent = true;
              } else {
                cleanedScripts[key] = DEFAULT_QUALIFICATION_SCRIPTS[key as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS] || {
                  title: '',
                  content: ''
                };
              }
            }
          }
          
          if (hasValidContent) {
            setSectionScripts(cleanedScripts);
          } else {
            console.warn("List ID qualification script content appears to be test data. Using defaults.");
            setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
          }
        }
      } catch (parseError) {
        console.error("Failed to parse JSON for list ID qualification script:", parseError);
        console.warn("Using default qualification scripts.");
        setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
      }
    }
  }, [scriptData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate content before saving
      const testDataPatterns = ['mysql', 'test', 'sucess', 'success test', '--A--'];
      const hasInvalidContent = Object.values(sectionScripts).some(section => {
        const content = String(section.content || '').toLowerCase().trim();
        return testDataPatterns.some(pattern => content === pattern || content.includes(pattern));
      });
      
      if (hasInvalidContent) {
        throw new Error("Please remove test data (like 'mysql', 'test') before saving. Use actual qualification questions.");
      }
      
      // Validate that at least one section has meaningful content
      const hasValidContent = Object.values(sectionScripts).some(section => {
        const content = String(section.content || '').trim();
        return content.length > 10 && !content.startsWith('(') && !content.includes('No content');
      });
      
      if (!hasValidContent) {
        throw new Error("Please add actual qualification questions before saving.");
      }
      
      const jsonContent = JSON.stringify(sectionScripts, null, 2);
      
      // Fetch existing name to include in payload (required for new inserts)
      const existingRecord = await mysqlApi.findOneByFields<{ name: string }>(
        "homebound_list_id_config",
        { list_id: listId }
      );
      
      const payload = {
        list_id: listId,
        step_name: "qualification",
        title: "Qualification Questions",
        content: jsonContent,
        name: existingRecord?.name || listId, // Required field - use existing value
      };

      await mysqlApi.upsertByFields(
        "homebound_list_id_config",
        payload,
        "list_id,step_name"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-script-sectioned", listId, "qualification"] });
      toast.success("Qualification sections saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save sections");
    },
  });

  const handleReset = () => {
    if (scriptData && scriptData.content) {
      try {
        const parsed = JSON.parse(scriptData.content);
        if (parsed && typeof parsed === 'object' && 'personal' in parsed) {
          setSectionScripts(parsed);
          toast.info("Changes reset");
          return;
        }
      } catch {
        // Fall through to defaults
      }
    }
    setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
    toast.info("Reset to defaults");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Qualification Questions by Section</CardTitle>
        <CardDescription>
          Configure the script for each section of the qualification form for List ID: {listId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="loan">Loan</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {Object.entries(sectionScripts).map(([sectionKey, script]) => (
            <TabsContent key={sectionKey} value={sectionKey} className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label>Section Title</Label>
                  <Input
                    value={script.title}
                    onChange={(e) => {
                      setSectionScripts({
                        ...sectionScripts,
                        [sectionKey]: { ...script, title: e.target.value }
                      });
                    }}
                    className="mt-2"
                    placeholder="e.g., Personal Information"
                  />
                </div>
                <div>
                  <Label>Script / Questions</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter the questions agents should ask for this section
                  </p>
                  <Textarea
                    value={script.content}
                    onChange={(e) => {
                      setSectionScripts({
                        ...sectionScripts,
                        [sectionKey]: { ...script, content: e.target.value }
                      });
                    }}
                    placeholder="Enter the script content for this section..."
                    className="mt-2 min-h-[300px] font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saveMutation.isPending}>
            Reset
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Sections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
