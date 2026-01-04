import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Check, X, Pencil, CheckCircle2 } from "lucide-react";
import { useSpielAlternatives } from "@/hooks/useSpielAlternatives";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { isManagerUserSync } from "@/lib/managerUtils";

interface SpielDisplayProps {
  content: string;
  stepName: string;
  accentColor?: string;
  listId?: string | null; // Optional: if provided, indicates this is a list ID script
  stepTitle?: string; // Optional: title for the script step
}

interface UnifiedItem {
  spielId: string;
  text: string;
  isOriginal: boolean;
  altOrder?: number;
  submittedBy?: string;
  isSubmission?: boolean;
}

export const SpielDisplay = ({ content, stepName, accentColor = "border-primary", listId, stepTitle }: SpielDisplayProps) => {
  const { leadData } = useVICI();
  const queryClient = useQueryClient();
  const { 
    alternatives, 
    getAlternativesForSpiel, 
    saveAlternative, 
    addAlternative,
    isSaving,
    scriptName,
  } = useSpielAlternatives(stepName);
  
  const { approvedSubmissions, userSubmissions, submitScript, isSubmitting: isSubmittingScript } = useScriptSubmissions(scriptName, 'spiel', leadData);
  
  // Initialize with 0, will be restored from database
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newAltText, setNewAltText] = useState("");
  const hasRestoredRef = useRef(false);
  const hasLoggedViewRef = useRef(false);
  const isUserCyclingRef = useRef(false); // Track if user is actively cycling
  const prevIndexRef = useRef<number>(0); // Track previous index to prevent loops
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce API calls
  const [defaultIndex, setDefaultIndex] = useState<number | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  
  const currentUserId = getUserId(leadData);
  
  // Build unified list: base spiel + alternatives + approved submissions + user's own submissions
  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    const userId = getUserId(leadData);
    
    // Get alternatives first to check if we have any
    const alts = getAlternativesForSpiel('spiel_0');
    
    // Add original content as first item (only if it exists)
    if (content && content.trim()) {
      items.push({
        spielId: 'spiel_0',
        text: content.trim(),
        isOriginal: true,
        scriptType: 'default',
      });
    }
    
    // Add alternatives for the base spiel (custom only - exclude approved submissions)
    // Approved submissions are shown separately with "submitted by [user id]" badge
    const approvedSubmissionTexts = new Set(approvedSubmissions.map(s => s.alt_text.trim()));
    alts.forEach((alt) => {
      // Skip if this alternative matches an approved submission (to avoid duplicates)
      if (!approvedSubmissionTexts.has(alt.alt_text.trim())) {
        items.push({
          spielId: 'spiel_0',
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
        spielId: 'spiel_0',
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
            spielId: 'spiel_0',
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
  }, [content, getAlternativesForSpiel, alternatives, approvedSubmissions, userSubmissions, leadData]);

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
            
            // Restore defaultIndex (which one is set as default) - prioritize this
            // Check if defaultIndex exists (including 0, which is a valid default)
            // Use typeof check to ensure it's actually a number, not just falsy
            if (typeof stepSettings.defaultIndex === 'number') {
              const userDefaultIndex = stepSettings.defaultIndex;
              if (userDefaultIndex >= 0 && userDefaultIndex < unifiedList.length) {
                setDefaultIndex(userDefaultIndex);
                // Always show the default spiel on page load/refresh
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
                setDefaultIndex(null);
                hasRestoredRef.current = true;
                return;
              } else if (dbIndex >= unifiedList.length) {
                // If saved index is out of bounds, reset to last valid index
                const validIndex = Math.max(0, unifiedList.length - 1);
                setCurrentIndex(validIndex);
                setDefaultIndex(null);
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
          
          // No saved selection found, use default index 0 (first/primary spiel)
          setDefaultIndex(null);
          hasRestoredRef.current = true;
        } catch (error) {
          console.error('Error loading saved spiel selection:', error);
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
  
  // Log when script is viewed (only once per component mount)
  useEffect(() => {
    if (unifiedList.length > 0 && !hasLoggedViewRef.current) {
      hasLoggedViewRef.current = true;
      logUserAction(
        leadData,
        'viewed',
        `Viewed ${stepName} script section`,
        undefined,
        { stepName, listId: leadData.list_id }
      ).catch(err => console.error('Failed to log view action:', err));
    }
  }, [unifiedList.length, stepName, leadData]);
  
  // Validate and adjust index when unifiedList changes (e.g., alternatives added/removed)
  // Removed currentIndex from dependencies to prevent loops
  useEffect(() => {
    if (unifiedList.length > 0 && currentIndex >= unifiedList.length) {
      const validIndex = unifiedList.length - 1;
      
      // Only update if index actually changed to prevent loops
      if (prevIndexRef.current !== validIndex) {
        setCurrentIndex(validIndex);
        prevIndexRef.current = validIndex;
        
        // Debounce the API call to prevent spam
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        const userId = getUserId(leadData);
        if (userId) {
          saveTimeoutRef.current = setTimeout(() => {
            saveUserSpielSelection(leadData, stepName, validIndex, unifiedList.length)
              .catch(err => console.error('Error saving adjusted spiel selection:', err));
          }, 500); // 500ms debounce
        }
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [unifiedList.length, leadData, stepName]); // Removed currentIndex to prevent loops

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
          .catch(err => console.error('Failed to save spiel selection:', err))
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
      // Use HTML content if available, otherwise use plain text
      setEditText(currentItem.text);
    }
  }, [currentItem]);

  // Save edited item
  const handleSaveEdit = useCallback(async () => {
    // Check if content is HTML (contains HTML tags)
    const isHTMLContent = /<[a-z][\s\S]*>/i.test(editText);
    // For HTML, preserve the structure; for plain text, trim whitespace
    const textToSave = isHTMLContent ? editText : editText.trim();
    
    if (!textToSave || !currentItem) {
      setIsEditing(false);
      return;
    }

    if (currentItem.isOriginal) {
      // Editing original - update the base script in tmdebt_script or tmdebt_list_id_config
      try {
        const effectiveListId = listId || leadData?.list_id;
        const hasValidListId = effectiveListId && !effectiveListId.includes('--A--');
        
        if (hasValidListId) {
          // Update list ID config
          const existingConfig = await mysqlApi.findOneByFields<{ name: string }>(
            "tmdebt_list_id_config",
            { list_id: effectiveListId, step_name: stepName }
          );
          
          await mysqlApi.upsertByFields("tmdebt_list_id_config", {
            list_id: effectiveListId,
            step_name: stepName,
            title: stepTitle || existingConfig?.name || stepName,
            content: textToSave,
            name: existingConfig?.name || effectiveListId,
          }, "list_id,step_name");
          
          // Invalidate list ID config queries
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listIdConfig.byListId(effectiveListId) });
        } else {
          // Update default script in tmdebt_script
          await mysqlApi.upsertByFields("tmdebt_script", {
            step_name: stepName,
            title: stepTitle || stepName,
            content: textToSave,
            button_config: JSON.stringify([]),
          });
        }
        
        // Invalidate script display queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
        queryClient.invalidateQueries({ queryKey: ['scripts', 'display'] });
        
        toast.success("Script updated");
        
        // Log user action
        logUserAction(
          leadData,
          'modified',
          `Updated original script for ${stepName}`,
          undefined,
          { stepName, newText: textToSave, listId: effectiveListId }
        ).catch(err => console.error('Failed to log user action:', err));
      } catch (error: any) {
        console.error('Error updating original script:', error);
        toast.error("Failed to update script");
      }
    } else if (currentItem.altOrder !== undefined) {
      // Editing existing alternative
      const previousText = currentItem.text;
      await saveAlternative(currentItem.spielId, textToSave, currentItem.altOrder);
      toast.success("Alternative saved");
      
      // Log user action
      logUserAction(
        leadData,
        'modified',
        `Modified alternative ${currentItem.altOrder} for ${stepName}`,
        undefined,
        { stepName, altOrder: currentItem.altOrder, previousText, newText: textToSave }
      ).catch(err => console.error('Failed to log user action:', err));
    }
    
    setIsEditing(false);
    setEditText("");
  }, [editText, currentItem, addAlternative, saveAlternative, leadData, stepName]);

  // Set a specific spiel as default for logged-in user
  const handleSetDefault = useCallback(async (index: number) => {
    const userId = getUserId(leadData);
    if (!userId) {
      toast.error('Please log in to set default');
      return;
    }

    // If editing the same item, save changes first
    if (isEditing && editText.trim() && currentItem && index === safeIndex) {
      await handleSaveEdit();
    }

    setIsSettingDefault(true);
    try {
      await setUserSpielDefault(leadData, stepName, index, unifiedList.length);
      setDefaultIndex(index);
      toast.success('Set as default');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default');
    } finally {
      setIsSettingDefault(false);
    }
  }, [leadData, stepName, unifiedList.length, isEditing, editText, currentItem, safeIndex, handleSaveEdit]);

  // Add new script - saves as submission and sets as default for user
  const handleAddAlternative = useCallback(async () => {
    // Check if content is HTML (contains HTML tags)
    const isHTMLContent = /<[a-z][\s\S]*>/i.test(newAltText);
    // For HTML, preserve the structure; for plain text, trim whitespace
    const textToSave = isHTMLContent ? newAltText : newAltText.trim();
    
    if (!textToSave) {
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
      const existing = getAlternativesForSpiel('spiel_0');
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await submitScript('spiel_0', textToSave, nextOrder);
      
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
        { stepName, altText: textToSave }
      ).catch(err => console.error('Failed to log user action:', err));
    } catch (error) {
      console.error('Error adding script:', error);
      toast.error("Failed to add script");
      setIsAdding(false);
    }
  }, [newAltText, submitScript, currentUserId, leadData, stepName, getAlternativesForSpiel, unifiedList.length]);


  // Empty state: no base content and no alternatives
  if (unifiedList.length === 0) {
    return (
      <div className="prose prose-sm md:prose-base max-w-none">
        <p className="text-muted-foreground italic">No script content configured. Add content in Settings.</p>
      </div>
    );
  }

  // Format variables [text] as code with orange color
  const formatVariablesAsCode = (text: string): string => {
    // Match [anything] patterns but exclude already formatted HTML
    // Only format if not already inside HTML tags
    return text.replace(/(\[[^\]]+\])/g, (match) => {
      // Check if this is already inside a code tag
      // This is a simple check - if the text contains HTML, we'll handle it differently
      if (text.includes('<code') && text.includes(match)) {
        // Already formatted, skip
        return match;
      }
      // Format as inline code with orange color
      return `<code style="color: #ea580c; background-color: rgba(234, 88, 12, 0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">${match}</code>`;
    });
  };

  // Process text - first format variables, then replace with actual values
  const rawText = currentItem ? currentItem.text : "";
  // Format variables as code before replacing them
  const textWithFormattedVars = formatVariablesAsCode(rawText);
  // Then replace variables with actual values (this will replace the formatted code too)
  const processedText = currentItem ? replaceScriptVariables(textWithFormattedVars, leadData) : "";
  // Improved HTML detection: checks for HTML tags (more reliable than simple includes)
  const isHTML = /<[a-z][\s\S]*>/i.test(processedText) || /<code/i.test(processedText);
  const isStandardUser = currentUserId === '001'; // Hide edit/delete for standard user
  const isAdmin = currentUserId === '000'; // Admin user can edit all
  const isManager = useMemo(() => {
    // Use manager check (sync version for immediate UI decisions)
    return isManagerUserSync(currentUserId);
  }, [currentUserId]);
  
  // Determine if edit should be shown for current item
  // Show edit if:
  // 1. User is admin (000) or manager (021 or database managers)
  // 2. User is the owner/creator of the script/spiel (for submissions, check submitted_by)
  // Hide by default for alternatives and original scripts (since we can't track creator in tmdebt_spiel_alts)
  const canEdit = useMemo(() => {
    if (isAdmin || isManager) return true; // Admin and manager can always edit
    if (!currentUserId) return false; // No user logged in, hide edit
    
    // For submissions, check if user is the submitter
    if (currentItem?.isSubmission && currentItem?.submittedBy) {
      return currentItem.submittedBy === currentUserId;
    }
    
    // For alternatives and original scripts, hide by default (no creator tracking)
    // Only admin/manager can edit these
    return false;
  }, [isAdmin, isManager, currentUserId, currentItem]);

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
          <div className="flex items-center gap-1 group">
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
            
            {/* Edit button - always visible, greyed out if no permission */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1 transition-colors ${
                    canEdit 
                      ? "text-muted-foreground hover:text-foreground cursor-pointer" 
                      : "text-muted-foreground/30 cursor-not-allowed opacity-50"
                  }`}
                  onClick={canEdit ? handleStartEdit : undefined}
                  disabled={!canEdit}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{canEdit ? (currentItem?.isOriginal ? 'Create alternative' : 'Edit') : 'No permission to edit'}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Add script button - always visible, greyed out if not logged in */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1 transition-colors ${
                    currentUserId 
                      ? "text-muted-foreground hover:text-blue-600 cursor-pointer" 
                      : "text-muted-foreground/30 cursor-not-allowed opacity-50"
                  }`}
                  onClick={currentUserId ? () => {
                    setIsAdding(true);
                    setNewAltText("");
                  } : undefined}
                  disabled={!currentUserId}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentUserId ? 'Add script (saves as your default)' : 'Please log in to add script'}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Set as default icon - always visible, greyed out if no permission or already default */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1 transition-all ${
                    defaultIndex === safeIndex
                      ? "text-muted-foreground/30 cursor-not-allowed opacity-50"
                      : getUserId(leadData)
                        ? (isEditing || isAdding)
                          ? "text-muted-foreground hover:text-green-600 cursor-pointer opacity-100"
                          : "text-muted-foreground hover:text-green-600 cursor-pointer opacity-0 group-hover:opacity-100"
                        : "text-muted-foreground/30 cursor-not-allowed opacity-50"
                  }`}
                  onClick={defaultIndex !== safeIndex && getUserId(leadData) ? () => handleSetDefault(safeIndex) : undefined}
                  disabled={isSettingDefault || defaultIndex === safeIndex || !getUserId(leadData)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {defaultIndex === safeIndex 
                    ? 'Already set as default' 
                    : !getUserId(leadData)
                      ? 'Please log in to set default'
                      : 'Set as default'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content with colored left border */}
        <div className={`border-l-2 ${accentColor} pl-4`}>
          {isEditing ? (
            <div className="space-y-2">
              <RichTextEditor
                value={editText}
                onChange={setEditText}
                placeholder="Enter script text..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                  // Ctrl/Cmd + Enter to save
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
                className="min-h-[200px]"
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
              <RichTextEditor
                value={newAltText}
                onChange={setNewAltText}
                placeholder="Enter alternative text..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAdding(false);
                  // Ctrl/Cmd + Enter to save
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlternative();
                  }
                }}
                className="min-h-[200px]"
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
                  disabled={isSubmittingScript || !newAltText || (!/<[a-z][\s\S]*>/i.test(newAltText) && !newAltText.trim())}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save & Set Default
                </Button>
              </div>
            </div>
          ) : (
            isHTML ? (
              <div 
                className="font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose prose prose-sm max-w-none [&_code]:font-mono [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:font-mono [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
                dangerouslySetInnerHTML={{ __html: processedText }}
              />
            ) : (
              <div className="whitespace-pre-wrap font-sans text-foreground text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose">
                {processedText.split(/(\[[^\]]+\])/g).map((part, index) => {
                  // Check if this part is a variable pattern
                  if (/^\[.+\]$/.test(part)) {
                    return (
                      <code
                        key={index}
                        className="font-mono text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 px-1.5 py-0.5 rounded"
                      >
                        {part}
                      </code>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
            )
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
