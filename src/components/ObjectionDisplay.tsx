import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Check, X, Pencil, CheckCircle2 } from "lucide-react";
import { useObjectionAlternatives } from "@/hooks/useObjectionAlternatives";
import { useScriptSubmissions } from "@/hooks/useScriptSubmissions";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { saveUserSpielSelection, logUserAction, getUserSpielSettings, getUserId, setUserSpielDefault } from "@/lib/userHistory";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ObjectionDisplayProps {
  content: string;
  stepName: string;
  accentColor?: string;
}

interface UnifiedItem {
  objectionId: string;
  text: string;
  isOriginal: boolean;
  altOrder?: number;
  submissionId?: number;
  submittedBy?: string;
  isSubmission?: boolean;
  isApproved?: boolean;
  scriptType?: 'default' | 'custom' | 'submitted';
}

export const ObjectionDisplay = ({ content, stepName, accentColor = "border-amber-500" }: ObjectionDisplayProps) => {
  const { leadData } = useVICI();
  const { 
    alternatives, 
    getAlternativesForObjection, 
    saveAlternative, 
    addAlternative,
    isSaving,
    scriptName,
  } = useObjectionAlternatives(stepName);
  
  const { approvedSubmissions, userSubmissions, submitScript, isSubmitting: isSubmittingScript } = useScriptSubmissions(scriptName, 'objection', leadData);
  
  // Initialize with 0, will be restored from database
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newAltText, setNewAltText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasRestoredRef = useRef(false);
  const hasLoggedViewRef = useRef(false);
  const isUserCyclingRef = useRef(false); // Track if user is actively cycling
  const [defaultIndex, setDefaultIndex] = useState<number | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  
  const currentUserId = getUserId(leadData);
  
  // Build unified list: base objection + alternatives + approved submissions + user's own submissions
  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    const userId = getUserId(leadData);
    
    // Get alternatives first to check if we have any
    const alts = getAlternativesForObjection('objection_0');
    
    // Add original content as first item (only if it exists)
    if (content && content.trim()) {
      items.push({
        objectionId: 'objection_0',
        text: content.trim(),
        isOriginal: true,
        scriptType: 'default',
      });
    }
    
    // Add alternatives for the base objection (custom only - exclude approved submissions)
    // Approved submissions are shown separately with "submitted by [user id]" badge
    const approvedSubmissionTexts = new Set(approvedSubmissions.map(s => s.alt_text.trim()));
    alts.forEach((alt) => {
      // Skip if this alternative matches an approved submission (to avoid duplicates)
      if (!approvedSubmissionTexts.has(alt.alt_text.trim())) {
        items.push({
          objectionId: 'objection_0',
          text: alt.alt_text,
          isOriginal: false,
          altOrder: alt.alt_order,
          scriptType: 'custom',
        });
      }
    });
    
    // Add approved submissions (globally available, shows "submitted by [user id]")
    approvedSubmissions.forEach((submission) => {
      items.push({
        objectionId: 'objection_0',
        text: submission.alt_text,
        isOriginal: false,
        altOrder: submission.alt_order,
        submissionId: submission.id,
        submittedBy: submission.submitted_by,
        isSubmission: true,
        isApproved: true,
        scriptType: 'submitted',
      });
    });
    
    // Add user's own pending/approved submissions (only visible to the submitter)
    if (userId) {
      userSubmissions.forEach((submission) => {
        // Only add if not already in approved submissions
        if (!approvedSubmissions.some(approved => approved.id === submission.id)) {
          items.push({
            objectionId: 'objection_0',
            text: submission.alt_text,
            isOriginal: false,
            altOrder: submission.alt_order,
            submissionId: submission.id,
            submittedBy: submission.submitted_by,
            isSubmission: true,
            isApproved: submission.status === 'approved',
            scriptType: 'submitted',
          });
        }
      });
    }
    
    return items;
  }, [content, getAlternativesForObjection, alternatives, approvedSubmissions, userSubmissions, leadData]);

  // Restore saved index from database when unifiedList is available
  // This runs whenever the list changes to ensure we always show the saved selection
  useEffect(() => {
    if (unifiedList.length > 0) {
      const restoreSelection = async () => {
        try {
          const userId = getUserId(leadData);
          if (!userId) {
            // No user logged in, use default index 0
            hasRestoredRef.current = true;
            return;
          }

          const dbSettings = await getUserSpielSettings(userId, stepName);
          if (dbSettings && dbSettings[stepName]) {
            const stepSettings = dbSettings[stepName];
            
            // Restore defaultIndex (which one is set as default) - prioritize this on refresh
            // Check if defaultIndex exists (including 0, which is a valid default)
            // Use typeof check to ensure it's actually a number, not just falsy
            if (typeof stepSettings.defaultIndex === 'number') {
              const userDefaultIndex = stepSettings.defaultIndex;
              if (userDefaultIndex >= 0 && userDefaultIndex < unifiedList.length) {
                setDefaultIndex(userDefaultIndex);
                // Always show the default on page load/refresh
                setCurrentIndex(userDefaultIndex);
                hasRestoredRef.current = true;
                return;
              }
            }
            
            // If no default is set, use selectedIndex
            if (typeof stepSettings.selectedIndex === 'number') {
              const dbIndex = stepSettings.selectedIndex;
              if (dbIndex >= 0 && dbIndex < unifiedList.length) {
                setCurrentIndex(dbIndex);
                hasRestoredRef.current = true;
                return;
              } else if (dbIndex >= unifiedList.length) {
                // If saved index is out of bounds, reset to last valid index
                const validIndex = Math.max(0, unifiedList.length - 1);
                setCurrentIndex(validIndex);
                // Save corrected index to database
                await saveUserSpielSelection(leadData, stepName, validIndex, unifiedList.length);
                hasRestoredRef.current = true;
                return;
              }
            }
            
            // No valid index found in settings
            setDefaultIndex(null);
            hasRestoredRef.current = true;
            return;
          }
          
          // No saved selection found, use default index 0 (first/primary)
          setDefaultIndex(null);
          hasRestoredRef.current = true;
        } catch (error) {
          console.error('Error loading saved objection selection:', error);
          hasRestoredRef.current = true;
        }
      };
      
      // Only restore if we haven't restored yet (to avoid overriding user actions)
      if (!hasRestoredRef.current) {
        restoreSelection();
      } else {
        // If list changed (e.g., alternatives added), validate and restore default from database
        // Only validate if user is not actively cycling (to prevent double updates)
        if (!isUserCyclingRef.current) {
          const validateIndex = async () => {
            const userId = getUserId(leadData);
            if (!userId) return;

            try {
              const dbSettings = await getUserSpielSettings(userId, stepName);
              if (dbSettings && dbSettings[stepName]) {
                // Prioritize defaultIndex - always show default on refresh
                const userDefaultIndex = dbSettings[stepName].defaultIndex;
                if (userDefaultIndex !== undefined && userDefaultIndex >= 0 && userDefaultIndex < unifiedList.length) {
                  if (currentIndex !== userDefaultIndex) {
                    setCurrentIndex(userDefaultIndex);
                  }
                  if (defaultIndex !== userDefaultIndex) {
                    setDefaultIndex(userDefaultIndex);
                  }
                  return;
                }
                
                // If no default, use selectedIndex
                const dbIndex = dbSettings[stepName].selectedIndex;
                if (dbIndex >= 0 && dbIndex < unifiedList.length) {
                  // Only update if current index doesn't match saved index
                  if (currentIndex !== dbIndex) {
                    setCurrentIndex(dbIndex);
                  }
                } else if (dbIndex >= unifiedList.length) {
                  // If saved index is out of bounds, reset to last valid index
                  const validIndex = Math.max(0, unifiedList.length - 1);
                  setCurrentIndex(validIndex);
                  await saveUserSpielSelection(leadData, stepName, validIndex, unifiedList.length);
                }
              }
            } catch (error) {
              console.error('Error validating index:', error);
            }
          };
          validateIndex();
        }
      }
    }
  }, [unifiedList.length, leadData, stepName]); // Removed currentIndex from dependencies
  
  // Log when objection script is viewed (only once per component mount)
  useEffect(() => {
    if (unifiedList.length > 0 && !hasLoggedViewRef.current) {
      hasLoggedViewRef.current = true;
      logUserAction(
        leadData,
        'viewed',
        `Viewed ${stepName} objection handling section`,
        undefined,
        { stepName, listId: leadData.list_id }
      ).catch(err => console.error('Failed to log view action:', err));
    }
  }, [unifiedList.length, stepName, leadData]);
  
  // Validate and adjust index when unifiedList changes (e.g., alternatives added/removed)
  useEffect(() => {
    if (unifiedList.length > 0 && currentIndex >= unifiedList.length) {
      const validIndex = unifiedList.length - 1;
      setCurrentIndex(validIndex);
      // Save corrected index to database
      const userId = getUserId(leadData);
      if (userId) {
        saveUserSpielSelection(leadData, stepName, validIndex, unifiedList.length)
          .catch(err => console.error('Error saving adjusted objection selection:', err));
      }
    }
  }, [unifiedList.length, currentIndex, leadData, stepName]);

  // Safe current index
  const safeIndex = unifiedList.length > 0 ? currentIndex % unifiedList.length : 0;
  const currentItem = unifiedList[safeIndex];

  // Cycle to next item
  const handleCycle = useCallback(() => {
    if (unifiedList.length > 1) {
      // Mark that user is actively cycling to prevent validation from overriding
      isUserCyclingRef.current = true;
      
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % unifiedList.length;
        
        // Save to database asynchronously (don't await to avoid blocking UI)
        saveUserSpielSelection(leadData, stepName, nextIndex, unifiedList.length)
          .catch(err => console.error('Failed to save objection selection:', err))
          .finally(() => {
            // Reset the flag after a short delay to allow state to settle
            setTimeout(() => {
              isUserCyclingRef.current = false;
            }, 100);
          });
        
        return nextIndex;
      });
    }
  }, [unifiedList.length, leadData, stepName]);

  // Start editing current item
  const handleStartEdit = useCallback(() => {
    if (currentItem) {
      setIsEditing(true);
      setEditText(currentItem.text);
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 0);
    }
  }, [currentItem]);

  // Save edited item
  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim() || !currentItem) {
      setIsEditing(false);
      return;
    }

    if (currentItem.isOriginal) {
      // Editing original - save as new alternative
      await addAlternative(currentItem.objectionId, editText.trim());
      toast.success("Alternative added");
      
      // Log user action
      logUserAction(
        leadData,
        'added',
        `Added new objection alternative for ${stepName}`,
        undefined,
        { stepName, objectionId: currentItem.objectionId, altText: editText.trim() }
      ).catch(err => console.error('Failed to log user action:', err));
    } else if (currentItem.altOrder !== undefined) {
      // Editing existing alternative
      const previousText = currentItem.text;
      await saveAlternative(currentItem.objectionId, editText.trim(), currentItem.altOrder);
      toast.success("Alternative saved");
      
      // Log user action
      logUserAction(
        leadData,
        'modified',
        `Modified objection alternative ${currentItem.altOrder} for ${stepName}`,
        undefined,
        { stepName, objectionId: currentItem.objectionId, altOrder: currentItem.altOrder, previousText, newText: editText.trim() }
      ).catch(err => console.error('Failed to log user action:', err));
    }
    
    setIsEditing(false);
    setEditText("");
  }, [editText, currentItem, addAlternative, saveAlternative, leadData, stepName]);

  // Set as default handler
  const handleSetDefault = useCallback(async (indexToSet: number) => {
    const userId = getUserId(leadData);
    if (!userId) {
      toast.error('Please log in to set default');
      return;
    }

    if (isEditing && editText.trim() && currentItem) {
      await handleSaveEdit();
    }

    setIsSettingDefault(true);
    try {
      await setUserSpielDefault(leadData, stepName, indexToSet, unifiedList.length);
      setDefaultIndex(indexToSet); // Update local state
      setCurrentIndex(indexToSet); // Also set as current selection
      toast.success('Set as default');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default');
    } finally {
      setIsSettingDefault(false);
    }
  }, [leadData, stepName, unifiedList.length, isEditing, editText, currentItem]);

  // Add new script - saves as submission and sets as default for user
  const handleAddAlternative = useCallback(async () => {
    if (!newAltText.trim()) {
      setIsAdding(false);
      return;
    }

    if (!currentUserId) {
      toast.error("Please log in to add scripts");
      setIsAdding(false);
      return;
    }

    try {
      // Submit the script (saves as submission)
      const existing = getAlternativesForObjection('objection_0');
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await submitScript('objection_0', newAltText.trim(), nextOrder);
      
      // Calculate the new index (it will be after all existing items)
      const currentListLength = unifiedList.length;
      const newIndex = currentListLength; // New submission will be at this index
      
      // Set as default for the user
      await setUserSpielDefault(leadData, stepName, newIndex, currentListLength + 1);
      setDefaultIndex(newIndex);
      setCurrentIndex(newIndex);
      
      setIsAdding(false);
      setNewAltText("");
      toast.success("Script saved and set as your default");
      
      // Log user action
      logUserAction(
        leadData,
        'submitted',
        `Added and set as default script for ${stepName}`,
        undefined,
        { stepName, altText: newAltText.trim() }
      ).catch(err => console.error('Failed to log user action:', err));
    } catch (error) {
      console.error('Error adding script:', error);
      toast.error("Failed to add script");
      setIsAdding(false);
    }
  }, [newAltText, submitScript, currentUserId, leadData, stepName, getAlternativesForObjection, unifiedList.length, setUserSpielDefault]);

  // Empty state: no base content and no alternatives
  if (unifiedList.length === 0) {
    return (
      <div className="prose prose-sm md:prose-base max-w-none">
        <p className="text-muted-foreground italic">No objection handling content configured. Add content in Settings.</p>
      </div>
    );
  }

  const displayText = currentItem ? replaceScriptVariables(currentItem.text, leadData) : "";
  const isStandardUser = currentUserId === '001'; // Hide edit/delete for standard user

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Action bar with counter and icons */}
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0.5 font-normal border-border"
          >
            {safeIndex + 1} of {unifiedList.length}
          </Badge>
          
          {/* Action icons */}
          <div className="flex items-center gap-1">
            {unifiedList.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleCycle}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next ({safeIndex + 1}/{unifiedList.length})</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Edit button - hidden for standard user (001) */}
            {!isStandardUser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{currentItem?.isOriginal ? 'Create alternative' : 'Edit'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Add script button - available for all logged-in users */}
            {currentUserId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setIsAdding(true);
                      setNewAltText("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add script (saves as your default)</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Set as default icon - only show if current objection is not already default */}
            {defaultIndex !== safeIndex && getUserId(leadData) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-green-600 transition-colors"
                    onClick={() => handleSetDefault(safeIndex)}
                    disabled={isSettingDefault}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set as default</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content with colored left border */}
        <div className={`border-l-2 ${accentColor} pl-4`}>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                  // Ctrl/Cmd + Enter to save
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
                className="min-h-[200px] font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose resize-y whitespace-pre-wrap"
                placeholder="Enter objection response text..."
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : isAdding ? (
            <div className="space-y-2">
              <Textarea
                value={newAltText}
                onChange={(e) => setNewAltText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAdding(false);
                  // Ctrl/Cmd + Enter to save
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlternative();
                  }
                }}
                placeholder="Enter your script..."
                className="min-h-[200px] font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose resize-y whitespace-pre-wrap"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddAlternative}
                  disabled={isSubmittingScript || !newAltText.trim()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save & Set Default
                </Button>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-foreground text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose">
              {displayText}
            </pre>
          )}
        </div>
        
        {/* Script type badge at bottom of script page */}
        {currentItem && (
          <div className="mt-2 flex justify-start">
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 font-normal border-border"
            >
              {currentItem.scriptType === 'default' && 'Default'}
              {currentItem.scriptType === 'custom' && 'Custom'}
              {currentItem.scriptType === 'submitted' && currentItem.submittedBy && (
                currentItem.submittedBy === currentUserId 
                  ? 'Submitted by you' 
                  : `Submitted by ${currentItem.submittedBy}`
              )}
            </Badge>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
