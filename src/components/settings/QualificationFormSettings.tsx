import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mysqlApi } from "@/lib/mysql-api";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Settings, GripVertical, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormField {
  id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  field_section: string;
  field_options: any;
  is_required: boolean;
  zapier_field_name: string | null;
  placeholder: string | null;
  help_text: string | null;
  validation_rules: any;
  display_order: number;
  is_active: boolean;
}

export const QualificationFormSettings = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [editingOptions, setEditingOptions] = useState<{
    fieldId: number;
    options: Array<{ value: string; label: string }>;
  } | null>(null);
  const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const allFields = await mysqlApi.fetchAll<FormField>("qualification_form_fields");
      
      // Sort by display_order
      const sortedFields = allFields.sort((a, b) => a.display_order - b.display_order);
      setFields(sortedFields);
    } catch (error) {
      console.error("Error fetching form fields:", error);
      toast.error("Failed to load form fields");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (field: FormField) => {
    try {
      setSaving(true);

      await mysqlApi.update("qualification_form_fields", field.id, {
        field_label: field.field_label,
        is_required: field.is_required ? 1 : 0,
        is_active: field.is_active ? 1 : 0,
        placeholder: field.placeholder,
        help_text: field.help_text,
        zapier_field_name: field.zapier_field_name,
      });

      toast.success("Field updated successfully!");
      fetchFields();
      setEditingField(null);
    } catch (error: any) {
      console.error("Error updating field:", error);
      toast.error("Failed to update field");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (fieldId: number, currentState: boolean) => {
    try {
      await mysqlApi.update("qualification_form_fields", fieldId, { 
        is_active: !currentState ? 1 : 0 
      });

      toast.success(`Field ${!currentState ? "activated" : "deactivated"}`);
      fetchFields();
    } catch (error) {
      console.error("Error toggling field:", error);
      toast.error("Failed to update field");
    }
  };

  const handleUpdateOptions = async (fieldId: number, newOptions: Array<{ value: string; label: string }>) => {
    try {
      // Validation
      if (newOptions.length === 0) {
        toast.error("At least one option is required");
        return;
      }

      const values = newOptions.filter(opt => opt.value !== "").map(opt => opt.value);
      const duplicates = values.filter((val, idx) => values.indexOf(val) !== idx);
      if (duplicates.length > 0) {
        toast.error(`Duplicate values found: ${duplicates.join(", ")}`);
        return;
      }

      setSaving(true);

      await mysqlApi.update("qualification_form_fields", fieldId, {
        field_options: JSON.stringify({ options: newOptions })
      });

      toast.success("Dropdown options updated!");
      fetchFields();
      setEditingOptions(null);
    } catch (error: any) {
      console.error("Error updating options:", error);
      toast.error("Failed to update options");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    if (!editingOptions) return;
    setEditingOptions({
      ...editingOptions,
      options: [...editingOptions.options, { value: "", label: "" }]
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!editingOptions) return;
    const newOptions = editingOptions.options.filter((_, i) => i !== index);
    setEditingOptions({ ...editingOptions, options: newOptions });
  };

  const handleOptionChange = (index: number, field: 'value' | 'label', value: string) => {
    if (!editingOptions) return;
    const newOptions = [...editingOptions.options];
    newOptions[index][field] = value;
    setEditingOptions({ ...editingOptions, options: newOptions });
  };

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.field_section]) {
      acc[field.field_section] = [];
    }
    acc[field.field_section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  const sectionNames: Record<string, string> = {
    personal: "Personal Information",
    property: "Property Information",
    loan: "Current Loan Information",
    financial: "Financial Information",
  };

  // Parse field_options if it's a string
  const parseFieldOptions = (field: FormField) => {
    if (typeof field.field_options === 'string') {
      try {
        return JSON.parse(field.field_options);
      } catch {
        return field.field_options;
      }
    }
    return field.field_options;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Qualification Form Configuration</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Configure the fields that appear in the qualification form and their Zapier mappings.
      </p>

      {accessLevel !== 'operation' && (
        <Alert className="mb-6">
          <AlertDescription>
            <strong>Zapier Field Mapping Guide:</strong>
            <p className="mt-2 text-sm space-y-1">
              The "Zapier Field Name" determines how each field is sent to your Zapier webhook. Use these exact names:
            </p>
            <ul className="mt-2 text-xs font-mono space-y-1 list-disc list-inside">
              <li><code>borrower_email</code> - Email address</li>
              <li><code>borrower_first_name</code>, <code>borrower_last_name</code> - Names</li>
              <li><code>property_value</code>, <code>property_type</code>, <code>property_occupancy</code> - Property info</li>
              <li><code>current_mortgage_balance</code>, <code>current_interest_rate</code> - Loan info</li>
              <li><code>annual_income</code>, <code>credit_score_range</code>, <code>monthly_debt_payments</code> - Financial info</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="property">Property Info</TabsTrigger>
          <TabsTrigger value="loan">Loan Info</TabsTrigger>
          <TabsTrigger value="financial">Financial Info</TabsTrigger>
        </TabsList>

        {Object.entries(groupedFields).map(([section, sectionFields]) => (
          <TabsContent key={section} value={section} className="mt-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold mb-3">{sectionNames[section]}</h3>
              
              {sectionFields.map((field) => {
                const fieldOptions = parseFieldOptions(field);
                
                return (
                  <Card key={field.id} className="p-4">
                    {editingField?.id === field.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Field Label</Label>
                            <Input
                              value={editingField.field_label}
                              onChange={(e) =>
                                setEditingField({ ...editingField, field_label: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Zapier Field Name</Label>
                            <Input
                              value={editingField.zapier_field_name || ""}
                              onChange={(e) =>
                                setEditingField({ ...editingField, zapier_field_name: e.target.value })
                              }
                              placeholder="e.g., property_value"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Placeholder</Label>
                            <Input
                              value={editingField.placeholder || ""}
                              onChange={(e) =>
                                setEditingField({ ...editingField, placeholder: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Help Text</Label>
                            <Input
                              value={editingField.help_text || ""}
                              onChange={(e) =>
                                setEditingField({ ...editingField, help_text: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={editingField.is_required}
                                onCheckedChange={(checked) =>
                                  setEditingField({ ...editingField, is_required: checked })
                                }
                              />
                              <Label className="font-normal">Required</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={editingField.is_active}
                                onCheckedChange={(checked) =>
                                  setEditingField({ ...editingField, is_active: checked })
                                }
                              />
                              <Label className="font-normal">Active</Label>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingField(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateField(editingField)}
                              disabled={saving}
                              className="gap-1"
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Saving
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium text-sm">{field.field_label}</p>
                              <Badge variant={field.is_active ? "default" : "secondary"}>
                                {field.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {field.is_required && (
                                <Badge variant="outline">Required</Badge>
                              )}
                            </div>
                            {accessLevel !== 'operation' && (
                              <div className="text-xs text-muted-foreground space-y-1 ml-6">
                                <p>Field Name: <code className="bg-muted px-1 py-0.5 rounded">{field.field_name}</code></p>
                                <p>Type: {field.field_type}</p>
                                {field.zapier_field_name && (
                                  <p>Zapier Mapping: <code className="bg-muted px-1 py-0.5 rounded">{field.zapier_field_name}</code></p>
                                )}
                                {field.placeholder && <p>Placeholder: "{field.placeholder}"</p>}
                                {field.help_text && <p>Help: "{field.help_text}"</p>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Switch
                              checked={field.is_active}
                              onCheckedChange={() => handleToggleActive(field.id, field.is_active)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingField(field)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>

                        {/* Dropdown Options Display & Editor */}
                        {field.field_type === 'select' && fieldOptions?.options && (
                          <div className="ml-6 mt-3 pt-3 border-t">
                            {editingOptions?.fieldId === field.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold">Edit Dropdown Options</Label>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingOptions(null)}
                                      disabled={saving}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateOptions(field.id, editingOptions.options)}
                                      disabled={saving}
                                    >
                                      {saving ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          Saving
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-3 w-3 mr-1" />
                                          Save Options
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                  {editingOptions.options.map((option, index) => (
                                    <div key={index} className="flex gap-2 items-start p-2 bg-muted/30 rounded">
                                      <div className="flex-1 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Value</Label>
                                            <Input
                                              value={option.value}
                                              onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                                              placeholder="e.g., SINGLE_FAMILY"
                                              className="h-8 text-sm"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Label</Label>
                                            <Input
                                              value={option.label}
                                              onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                                              placeholder="e.g., Single Family Home"
                                              className="h-8 text-sm"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveOption(index)}
                                        className="h-8 w-8 p-0 text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddOption}
                                  className="gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Option
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-muted-foreground">Dropdown Options ({fieldOptions.options.length})</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingOptions({
                                      fieldId: field.id,
                                      options: [...fieldOptions.options]
                                    })}
                                    className="h-7 text-xs"
                                  >
                                    Edit Options
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {fieldOptions.options.slice(0, 5).map((opt: { value: string; label: string }, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {opt.label || opt.value}
                                    </Badge>
                                  ))}
                                  {fieldOptions.options.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{fieldOptions.options.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
};
