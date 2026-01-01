import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface ScriptSection {
  id: number | string;
  step_name: string;
  title: string;
  content: string;
}

interface ScriptEditorProps {
  stepName: string;
  stepTitle: string;
}

interface SectionScript {
  title: string;
  content: string;
  enabled?: boolean[]; // Array of enabled states for each question
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

export const ScriptEditor = ({ stepName, stepTitle }: ScriptEditorProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sectionScripts, setSectionScripts] = useState<Record<string, SectionScript>>({
    personal: { title: "Personal Information", content: "" },
    property: { title: "Property Information", content: "" },
    loan: { title: "Current Loan Information", content: "" },
    financial: { title: "Financial Information", content: "" }
  });

  // Helper function to parse questions from script content - defined early to be available in useEffect
  const parseQuestions = (content: string): string[] => {
    if (!content || content.trim() === "" || content.includes("(No content")) {
      return [];
    }
    
    // Split by newlines and filter out empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('(') && !line.startsWith('['));
  };

  // Fetch script using React Query
  const { data: section, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.scripts.byStep(stepName),
    queryFn: async () => {
      const data = await mysqlApi.findOneByField<ScriptSection>(
        "homebound_script",
        "step_name",
        stepName
      );
      return data;
    },
    enabled: !!stepName,
  });

  // Listen for keyboard shortcut save event
  useEffect(() => {
    const handleSaveShortcut = () => {
      if (!saving && content.trim()) {
        handleSave();
      }
    };

    window.addEventListener('save-settings-shortcut', handleSaveShortcut);
    return () => window.removeEventListener('save-settings-shortcut', handleSaveShortcut);
  }, [saving, content, title, stepName]);

  // Update local state when React Query data loads
  useEffect(() => {
    if (section) {
      setTitle(section.title);
      
      // Try to parse as sectioned JSON for qualification step (both inbound and outbound)
      if (stepName === "outbound_qualification" || stepName === "qualification") {
        try {
          const parsed = JSON.parse(section.content);
          if (parsed && typeof parsed === 'object' && 'personal' in parsed) {
            // Filter out test data and invalid content
            const testDataPatterns = ['mysql', 'test', 'sucess', 'success test', '--A--', 'placeholder'];
            const isValidContent = (content: string): boolean => {
              if (!content || content.trim() === "") return false;
              const contentLower = content.toLowerCase().trim();
              // Check if content is just test data
              return !testDataPatterns.some(pattern => contentLower.includes(pattern));
            };
            
            // Clean and validate each section
            const cleanedScripts: Record<string, SectionScript> = {};
            let hasValidContent = false;
            
            for (const [key, rawSectionData] of Object.entries(parsed)) {
              if (rawSectionData && typeof rawSectionData === 'object' && 'content' in rawSectionData) {
                const sectionData = rawSectionData as { content?: unknown; enabled?: unknown; title?: unknown };
                const sectionContent = String(sectionData.content || '').trim();
                if (isValidContent(sectionContent)) {
                  const questions = parseQuestions(sectionContent);
                  // Initialize enabled array - default all to true if not set
                  const enabled = Array.isArray(sectionData.enabled) 
                    ? sectionData.enabled 
                    : questions.map(() => true);
                  
                  cleanedScripts[key] = {
                    title: String(sectionData.title || DEFAULT_QUALIFICATION_SCRIPTS[key as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS]?.title || ''),
                    content: sectionContent,
                    enabled: enabled.slice(0, questions.length) // Ensure array length matches questions
                  };
                  hasValidContent = true;
                } else {
                  // Use default for invalid/test content
                  const defaultContent = DEFAULT_QUALIFICATION_SCRIPTS[key as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS]?.content || '';
                  const defaultQuestions = parseQuestions(defaultContent);
                  cleanedScripts[key] = {
                    ...DEFAULT_QUALIFICATION_SCRIPTS[key as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS],
                    enabled: defaultQuestions.map(() => true)
                  };
                }
              }
            }
            
            if (hasValidContent) {
              setSectionScripts(cleanedScripts);
            } else {
              // All content was invalid, use defaults
              console.warn("Qualification script content appears to be test data or invalid. Using defaults.");
              setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
            }
          } else {
            // Invalid structure
            console.warn("Qualification script has invalid structure. Using defaults.");
            setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
          }
        } catch (parseError) {
          // JSON parse failed - use defaults for qualification
          console.error("JSON parse failed for qualification script:", parseError);
          console.warn("Using default qualification scripts.");
          setSectionScripts(DEFAULT_QUALIFICATION_SCRIPTS);
        }
      } else {
        setContent(section.content);
      }
    } else {
      // Step doesn't exist in database yet
      if (stepName === "outbound_qualification" || stepName === "qualification") {
        // Use hardcoded defaults for qualification
        console.log("No database record found, using defaults");
        const defaultsWithEnabled = Object.entries(DEFAULT_QUALIFICATION_SCRIPTS).reduce((acc, [key, script]) => {
          const questions = parseQuestions(script.content);
          acc[key] = {
            ...script,
            enabled: questions.map(() => true)
          };
          return acc;
        }, {} as Record<string, SectionScript>);
        setSectionScripts(defaultsWithEnabled);
      } else {
        setTitle("");
        setContent("");
      }
    }
  }, [section, stepName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log("=== SAVE OPERATION START ===");
      console.log("Step name:", stepName);
      console.log("Title to save:", title);
      console.log("Content to save (first 100 chars):", content.substring(0, 100));
      console.log("Content length:", content.length);
      
      // Check if the record exists first
      const existingData = await mysqlApi.findOneByField<ScriptSection>(
        "homebound_script",
        "step_name",
        stepName
      );

      console.log("Existing record:", existingData ? {
        id: existingData.id,
        title: existingData.title,
        contentLength: existingData.content?.length,
        contentPreview: existingData.content?.substring(0, 100)
      } : "NOT FOUND");

      if (existingData) {
        // Record exists, update it
        const updatePayload = {
          title,
          content,
          // updated_at will be auto-handled by API
        };
        
        console.log("Update payload:", {
          title: updatePayload.title,
          contentLength: updatePayload.content.length,
          contentPreview: updatePayload.content.substring(0, 100)
        });
        
        await mysqlApi.updateByField(
          "homebound_script",
          "step_name",
          stepName,
          updatePayload
        );
        
        console.log("Update successful");
      } else {
        // Record doesn't exist, insert it
        const insertPayload = {
          step_name: stepName,
          title,
          content,
          button_config: [],
        };
        
        const insertId = await mysqlApi.create("homebound_script", insertPayload);
        console.log("Insert successful, ID:", insertId);
      }

      console.log("=== SAVE COMPLETED, INVALIDATING CACHE ===");
      // Invalidate cache to refresh all components using this script
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      toast.success("Section saved successfully!");
      console.log("=== CACHE INVALIDATED ===");
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast.error(error.message || "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSections = async () => {
    setSaving(true);
    try {
      // Validate content before saving
      const testDataPatterns = ['mysql', 'test', 'sucess', 'success test', '--A--'];
      const hasInvalidContent = Object.values(sectionScripts).some(section => {
        const content = String(section.content || '').toLowerCase().trim();
        return testDataPatterns.some(pattern => content === pattern || content.includes(pattern));
      });
      
      if (hasInvalidContent) {
        toast.error("Please remove test data (like 'mysql', 'test') before saving. Use actual qualification questions.");
        setSaving(false);
        return;
      }
      
      // Validate that at least one section has meaningful content
      const hasValidContent = Object.values(sectionScripts).some(section => {
        const content = String(section.content || '').trim();
        return content.length > 10 && !content.startsWith('(') && !content.includes('No content');
      });
      
      if (!hasValidContent) {
        toast.error("Please add actual qualification questions before saving.");
        setSaving(false);
        return;
      }
      
      const jsonContent = JSON.stringify(sectionScripts, null, 2);
      
      const existingData = await mysqlApi.findOneByField<ScriptSection>(
        "homebound_script",
        "step_name",
        stepName
      );

      if (existingData) {
        await mysqlApi.updateByField(
          "homebound_script",
          "step_name",
          stepName,
          {
            content: jsonContent,
            // updated_at auto-handled
          }
        );
      } else {
        await mysqlApi.create("homebound_script", {
          step_name: stepName,
          title: stepTitle,
          content: jsonContent,
          button_config: [],
        });
      }

      toast.success("Qualification sections saved!");
      // Invalidate cache to refresh all components using this script
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
    } catch (error: any) {
      console.error("Error saving sections:", error);
      toast.error(error.message || "Failed to save sections");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Special handling for qualification step (both inbound and outbound)
  if (stepName === "outbound_qualification" || stepName === "qualification") {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Qualification Questions by Section</h2>
            <p className="text-sm text-muted-foreground">
              Configure questions for each section. Default questions are shown, and you can override them with custom questions.
            </p>
          </div>

          <Tabs defaultValue="property">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="property">Property</TabsTrigger>
              <TabsTrigger value="loan">Loan</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
            </TabsList>

            {Object.entries(sectionScripts).map(([sectionKey, script]) => {
              const defaultScript = DEFAULT_QUALIFICATION_SCRIPTS[sectionKey as keyof typeof DEFAULT_QUALIFICATION_SCRIPTS];
              const defaultQuestions = parseQuestions(defaultScript?.content || '');
              const currentQuestions = parseQuestions(script.content);
              
              // Use current questions if they exist, otherwise show defaults
              const hasCustomQuestions = currentQuestions.length > 0;
              const questionsToDisplay = hasCustomQuestions ? currentQuestions : defaultQuestions;
              
              // Get enabled state array, default all to true
              const enabledStates = script.enabled || questionsToDisplay.map(() => true);
              // Ensure enabled array length matches questions
              const enabled = enabledStates.length === questionsToDisplay.length 
                ? enabledStates 
                : [...enabledStates, ...questionsToDisplay.slice(enabledStates.length).map(() => true)];
              
              return (
                <TabsContent key={sectionKey} value={sectionKey} className="mt-6">
                  <div className="space-y-6">
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
                      <Label className="text-base font-medium mb-3 block">Questions</Label>
                      <p className="text-xs text-muted-foreground mb-4">
                        {hasCustomQuestions 
                          ? "Custom questions are set. Edit them below or reset to use defaults. Toggle questions on/off to control visibility."
                          : "Default questions are shown. Type in the input fields to override with custom questions. Toggle questions on/off to control visibility."}
                      </p>
                      
                      <div className="space-y-4">
                        {questionsToDisplay.map((question, index) => {
                          const isUsingDefault = !hasCustomQuestions;
                          const questionKey = `q-${sectionKey}-${index}`;
                          const currentValue = hasCustomQuestions ? question : '';
                          const isEnabled = enabled[index] !== false; // Default to true if undefined
                          
                          return (
                            <div key={questionKey} className={`space-y-2 p-4 border rounded-lg ${!isEnabled ? 'bg-muted/30 opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex items-center gap-2 min-w-[3rem] pt-2">
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      const newEnabled = [...enabled];
                                      newEnabled[index] = checked;
                                      setSectionScripts({
                                        ...sectionScripts,
                                        [sectionKey]: { 
                                          ...script, 
                                          enabled: newEnabled
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {index + 1}.
                                  </span>
                                </div>
                                <div className="flex-1 space-y-2">
                                  {isUsingDefault && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        Default
                                      </Badge>
                                      <p className="text-xs text-muted-foreground italic">
                                        {question}
                                      </p>
                                    </div>
                                  )}
                                  <Input
                                    value={currentValue}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      let newQuestions: string[];
                                      
                                      if (isUsingDefault) {
                                        // Creating custom questions from defaults
                                        newQuestions = [...defaultQuestions];
                                        newQuestions[index] = newValue;
                                      } else {
                                        // Updating existing custom questions
                                        newQuestions = [...currentQuestions];
                                        newQuestions[index] = newValue;
                                      }
                                      
                                      // Update sectionScripts with new questions
                                      const newContent = newQuestions
                                        .filter(q => q.trim() !== '')
                                        .join('\n\n');
                                      
                                      setSectionScripts({
                                        ...sectionScripts,
                                        [sectionKey]: { 
                                          ...script, 
                                          content: newContent
                                        }
                                      });
                                    }}
                                    placeholder={isUsingDefault ? `Override: ${question.substring(0, 60)}...` : "Enter question"}
                                    className={isUsingDefault ? "border-dashed border-primary/50" : ""}
                                    disabled={!isEnabled}
                                  />
                                  {!isEnabled && (
                                    <p className="text-xs text-muted-foreground italic">
                                      This question is disabled and will not appear in the form
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {hasCustomQuestions && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Reset to defaults
                              const defaultQuestions = parseQuestions(defaultScript?.content || '');
                              setSectionScripts({
                                ...sectionScripts,
                                [sectionKey]: { 
                                  ...script, 
                                  content: defaultScript?.content || '',
                                  enabled: defaultQuestions.map(() => true)
                                }
                              });
                            }}
                          >
                            Reset to Default Questions
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) })} disabled={saving}>
              Reset
            </Button>
            <Button onClick={handleSaveSections} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Sections
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!section) {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-amber-600">{stepTitle}</h2>
            <p className="text-muted-foreground mb-4">
              This script doesn't exist in the database yet. You can create it by entering content below and clicking Save.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Section Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={stepTitle}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="content">Script Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter script content..."
                className="mt-2 min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleSave} disabled={saving || !content.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Script
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">{stepTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Edit the content for this section of your call script.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Section Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter section title..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="content">Script Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter script content..."
              className="mt-2 min-h-[300px] max-h-[500px] font-mono text-sm resize-y overflow-y-auto"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) })}
              disabled={saving}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
