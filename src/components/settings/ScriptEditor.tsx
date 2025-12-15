import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ScriptSection {
  id: string;
  step_name: string;
  title: string;
  content: string;
}

interface ScriptEditorProps {
  stepName: string;
  stepTitle: string;
}

export const ScriptEditor = ({ stepName, stepTitle }: ScriptEditorProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<ScriptSection | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    fetchSection();
  }, [stepName]);

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

  const fetchSection = async () => {
    setLoading(true);
    try {
      console.log("Fetching section for step_name:", stepName);
      
      const { data, error } = await supabase
        .from("homebound_script")
        .select("*")
        .eq("step_name", stepName)
        .maybeSingle();

      if (error) throw error;

      console.log("Fetched section:", data ? {
        id: data.id,
        step_name: data.step_name,
        title: data.title,
        contentLength: data.content?.length,
        contentPreview: data.content?.substring(0, 100)
      } : "NOT FOUND");

      if (data) {
        setSection(data);
        setTitle(data.title);
        setContent(data.content);
      } else {
        // Step doesn't exist in database yet
        setSection(null);
        setTitle("");
        setContent("");
      }
    } catch (error) {
      console.error("Error fetching section:", error);
      toast.error("Failed to load section");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log("=== SAVE OPERATION START ===");
      console.log("Step name:", stepName);
      console.log("Title to save:", title);
      console.log("Content to save (first 100 chars):", content.substring(0, 100));
      console.log("Content length:", content.length);
      
      // Check if the record exists first
      const { data: existingData, error: checkError } = await supabase
        .from("homebound_script")
        .select("*")
        .eq("step_name", stepName)
        .maybeSingle();

      console.log("Existing record:", existingData ? {
        id: existingData.id,
        title: existingData.title,
        contentLength: existingData.content?.length,
        contentPreview: existingData.content?.substring(0, 100)
      } : "NOT FOUND");

      if (checkError) throw checkError;

      let saveError;
      
      if (existingData) {
        // Record exists, update it
        const updatePayload = {
          title,
          content,
          updated_at: new Date().toISOString(),
        };
        
        console.log("Update payload:", {
          title: updatePayload.title,
          contentLength: updatePayload.content.length,
          contentPreview: updatePayload.content.substring(0, 100)
        });
        
        const { data: updateResult, error } = await supabase
          .from("homebound_script")
          .update(updatePayload)
          .eq("step_name", stepName)
          .select();
        
        saveError = error;
        console.log("Update result:", updateResult ? {
          count: updateResult.length,
          firstRecord: updateResult[0] ? {
            title: updateResult[0].title,
            contentLength: updateResult[0].content?.length,
            contentPreview: updateResult[0].content?.substring(0, 100)
          } : null
        } : "NO DATA RETURNED");
        console.log("Update error:", error);
      } else {
        // Record doesn't exist, insert it
        const { data: insertResult, error } = await supabase
          .from("homebound_script")
          .insert({
            step_name: stepName,
            title,
            content,
            button_config: [],
          })
          .select();
        
        saveError = error;
        console.log("Insert result:", insertResult);
        console.log("Insert error:", error);
      }

      if (saveError) throw saveError;

      console.log("=== SAVE COMPLETED, NOW FETCHING ===");
      toast.success("Section saved successfully!");
      await fetchSection();
      console.log("=== FETCH AFTER SAVE COMPLETED ===");
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Failed to save section");
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
              onClick={fetchSection}
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
