import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Loader2, Check, X } from "lucide-react";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { ObjectionAlternativesEditor } from "./ObjectionAlternativesEditor";

interface ObjectionListEditorProps {
  stepName: string;
  stepTitle: string;
}

interface ScriptSection {
  id: number | string;
  step_name: string;
  title: string;
  content: string;
}

interface Objection {
  id: string;
  title: string;
  response: string;
}

export const ObjectionListEditor = ({ stepName, stepTitle }: ObjectionListEditorProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newResponse, setNewResponse] = useState("");

  // Fetch script using React Query
  const { data: section, isLoading } = useQuery({
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

  // Parse objections from content
  const parseObjections = (content: string): Objection[] => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const parsed: Objection[] = [];
    let currentObjection: Partial<Objection> | null = null;
    let responseLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      
      if (boldMatch) {
        if (currentObjection?.title) {
          parsed.push({
            id: `obj_${parsed.length}`,
            title: currentObjection.title,
            response: responseLines.join('\n').trim(),
          });
        }
        currentObjection = { title: boldMatch[1] };
        responseLines = [];
      } else if (currentObjection && trimmed) {
        responseLines.push(trimmed);
      }
    });

    if (currentObjection?.title) {
      parsed.push({
        id: `obj_${parsed.length}`,
        title: currentObjection.title,
        response: responseLines.join('\n').trim(),
      });
    }

    return parsed;
  };

  // Convert objections back to content format
  const objectionsToContent = (objs: Objection[]): string => {
    return objs.map(obj => `**${obj.title}**\n${obj.response}`).join('\n\n');
  };

  useEffect(() => {
    if (section) {
      setObjections(parseObjections(section.content));
    }
  }, [section]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const content = objectionsToContent(objections);
      
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
          { title: stepTitle, content }
        );
      } else {
        await mysqlApi.create("homebound_script", {
          step_name: stepName,
          title: stepTitle,
          content,
          button_config: [],
        });
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      toast.success("Objections saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (obj: Objection) => {
    setEditingId(obj.id);
    setEditTitle(obj.title);
    setEditResponse(obj.response);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    
    setObjections(prev => prev.map(obj => 
      obj.id === editingId 
        ? { ...obj, title: editTitle.trim(), response: editResponse.trim() }
        : obj
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setObjections(prev => prev.filter(obj => obj.id !== id));
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    
    setObjections(prev => [
      ...prev,
      {
        id: `obj_${Date.now()}`,
        title: newTitle.trim(),
        response: newResponse.trim(),
      }
    ]);
    setNewTitle("");
    setNewResponse("");
    setIsAdding(false);
  };

  const objectionScriptName = stepName.includes("outbound") 
    ? "outbound_objection" 
    : "inbound_objection";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{stepTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Manage objection responses. Format: **Title** followed by response.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save All
            </Button>
          </div>
        </div>

        {/* Add new objection form */}
        {isAdding && (
          <div className="border rounded-lg p-3 mb-3 bg-muted/30 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Objection title (e.g., 'I'm not interested')"
              className="font-medium"
              autoFocus
            />
            <Input
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Response script..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Objections list */}
        <div className="space-y-2">
          {objections.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No objections yet. Click "Add" to create one.
            </p>
          )}
          
          {objections.map((obj, index) => (
            <div 
              key={obj.id}
              className="border rounded-lg p-2 hover:bg-muted/30 transition-colors group"
            >
              {editingId === obj.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Objection title"
                    className="font-medium text-sm"
                    autoFocus
                  />
                  <Input
                    value={editResponse}
                    onChange={(e) => setEditResponse(e.target.value)}
                    placeholder="Response"
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-start gap-2 cursor-pointer"
                  onClick={() => handleStartEdit(obj)}
                >
                  <span className="text-xs text-muted-foreground font-mono mt-1 w-5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{obj.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{obj.response}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(obj.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Alternatives editor */}
      {objections.length > 0 && (
        <ObjectionAlternativesEditor 
          scriptName={objectionScriptName}
          scriptContent={objectionsToContent(objections)}
        />
      )}
    </div>
  );
};
