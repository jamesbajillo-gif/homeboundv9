import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Type, 
  Palette,
  ChevronUp,
  ChevronDown,
  Code,
  Code2
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "18px" },
  { label: "X-Large", value: "20px" },
  { label: "XX-Large", value: "24px" },
];

const COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
  { label: "Purple", value: "#9333ea" },
  { label: "Gray", value: "#6b7280" },
];

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  autoFocus,
  onKeyDown,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isCodeBlock, setIsCodeBlock] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState("16px");
  const [currentColor, setCurrentColor] = useState("#000000");

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  // Update formatting state based on selection
  const updateFormattingState = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, use editor defaults
      const computedStyle = window.getComputedStyle(editorRef.current);
      setCurrentFontSize(computedStyle.fontSize || "16px");
      setCurrentColor(computedStyle.color || "#000000");
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3 
      ? container.parentElement 
      : container as HTMLElement;

    if (element) {
      // Check bold
      setIsBold(
        document.queryCommandState("bold") ||
        element.style.fontWeight === "bold" ||
        window.getComputedStyle(element).fontWeight === "700"
      );

      // Check italic
      setIsItalic(
        document.queryCommandState("italic") ||
        element.style.fontStyle === "italic"
      );

      // Check code formatting
      const isInCode = element.tagName === 'CODE' || element.closest('code');
      const isInCodeBlock = element.tagName === 'PRE' || element.closest('pre');
      setIsCode(!!isInCode && !isInCodeBlock);
      setIsCodeBlock(!!isInCodeBlock);

      // Check font size - look for inline style first, then computed
      const fontSize = element.style.fontSize || window.getComputedStyle(element).fontSize;
      if (fontSize) {
        setCurrentFontSize(fontSize);
      }

      // Check color - look for inline style first, then computed
      const color = element.style.color || window.getComputedStyle(element).color;
      if (color && color !== "rgba(0, 0, 0, 0)") {
        // Convert rgb to hex if needed
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          setCurrentColor(`#${r}${g}${b}`);
        } else {
          setCurrentColor(color);
        }
      }
    }
  };

  // Auto-format [variable] patterns as code with orange color
  const autoFormatVariables = useRef<NodeJS.Timeout | null>(null);
  
  const formatVariablesInText = (text: string): string => {
    // Match [anything] patterns that aren't already inside code tags
    return text.replace(/(\[[^\]]+\])/g, (match, p1, offset, string) => {
      // Check if this match is already inside a code tag
      const beforeMatch = string.substring(0, offset);
      const lastCodeOpen = beforeMatch.lastIndexOf('<code');
      const lastCodeClose = beforeMatch.lastIndexOf('</code>');
      
      // If there's an open code tag without a close tag before this match, skip
      if (lastCodeOpen > lastCodeClose) {
        return match;
      }
      
      // Format as code with orange color
      return `<code style="color: #ea580c; background-color: rgba(234, 88, 12, 0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: inherit;">${match}</code>`;
    });
  };

  // Handle input changes
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      
      // Clear any pending auto-format
      if (autoFormatVariables.current) {
        clearTimeout(autoFormatVariables.current);
      }
      
      // Auto-format variables after user stops typing (debounce)
      autoFormatVariables.current = setTimeout(() => {
        if (!editorRef.current) return;
        
        const currentHtml = editorRef.current.innerHTML;
        // Only format if there are unformatted [variable] patterns
        if (currentHtml.includes('[') && currentHtml.includes(']')) {
          // Check if there are any unformatted variables
          const hasUnformattedVars = /\[[^\]]+\]/.test(
            currentHtml.replace(/<code[^>]*>.*?<\/code>/gi, '')
          );
          
          if (hasUnformattedVars) {
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            
            // Format variables
            const formatted = formatVariablesInText(currentHtml);
            
            if (formatted !== currentHtml) {
              editorRef.current.innerHTML = formatted;
              
              // Try to restore cursor position
              if (range && editorRef.current) {
                try {
                  // Find the position after the last formatted variable
                  const textContent = editorRef.current.textContent || '';
                  const cursorPos = Math.min(range.startOffset, textContent.length);
                  
                  // Create a new range at the end
                  const newRange = document.createRange();
                  const walker = document.createTreeWalker(
                    editorRef.current,
                    NodeFilter.SHOW_TEXT,
                    null
                  );
                  
                  let currentPos = 0;
                  let targetNode: Node | null = null;
                  let targetOffset = 0;
                  
                  while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const nodeLength = node.textContent?.length || 0;
                    
                    if (currentPos + nodeLength >= cursorPos) {
                      targetNode = node;
                      targetOffset = cursorPos - currentPos;
                      break;
                    }
                    
                    currentPos += nodeLength;
                  }
                  
                  if (targetNode) {
                    newRange.setStart(targetNode, Math.max(0, targetOffset));
                    newRange.collapse(true);
                    selection?.removeAllRanges();
                    selection?.addRange(newRange);
                  } else {
                    editorRef.current.focus();
                  }
                } catch (e) {
                  editorRef.current.focus();
                }
              }
              
              onChange(formatted);
            }
          }
        }
      }, 500); // Wait 500ms after user stops typing
      
      onChange(html);
      updateFormattingState();
    }
  };

  // Handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      updateFormattingState();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // Formatting commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateFormattingState();
    handleInput();
  };

  const handleBold = () => {
    execCommand("bold");
  };

  const handleItalic = () => {
    execCommand("italic");
  };

  const handleFontSize = (size: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, apply to next typed text
      setCurrentFontSize(size);
      if (editorRef.current) {
        editorRef.current.style.fontSize = size;
      }
      editorRef.current?.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // No selection, apply to next typed text
      setCurrentFontSize(size);
      if (editorRef.current) {
        editorRef.current.style.fontSize = size;
      }
      editorRef.current?.focus();
      return;
    }

    // Has selection, wrap in span with font size
    try {
      const span = document.createElement("span");
      span.style.fontSize = size;
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // If surroundContents fails, extract and wrap
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
      
      onChange(editorRef.current?.innerHTML || "");
      setCurrentFontSize(size);
    } catch (error) {
      console.error("Error applying font size:", error);
    }
    
    editorRef.current?.focus();
  };

  const handleColor = (color: string) => {
    execCommand("foreColor", color);
  };

  const handleInlineCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editorRef.current?.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      // No selection, insert code tags for next typed text
      const code = document.createElement('code');
      code.style.fontFamily = 'monospace';
      code.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      code.style.padding = '2px 4px';
      code.style.borderRadius = '3px';
      range.insertNode(code);
      range.setStartAfter(code);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editorRef.current?.focus();
      return;
    }

    // Check if selection is already in a code element
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3 
      ? container.parentElement 
      : container as HTMLElement;
    
    if (element?.tagName === 'CODE' || element?.closest('code')) {
      // Unwrap code
      const codeElement = element.tagName === 'CODE' ? element : element.closest('code');
      if (codeElement) {
        const parent = codeElement.parentNode;
        while (codeElement.firstChild) {
          parent?.insertBefore(codeElement.firstChild, codeElement);
        }
        parent?.removeChild(codeElement);
        onChange(editorRef.current?.innerHTML || "");
        editorRef.current?.focus();
        return;
      }
    }

    // Wrap selection in code
    try {
      const code = document.createElement('code');
      code.style.fontFamily = 'monospace';
      code.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      code.style.padding = '2px 4px';
      code.style.borderRadius = '3px';
      
      try {
        range.surroundContents(code);
      } catch (e) {
        const contents = range.extractContents();
        code.appendChild(contents);
        range.insertNode(code);
      }
      
      onChange(editorRef.current?.innerHTML || "");
      editorRef.current?.focus();
    } catch (error) {
      console.error("Error applying inline code:", error);
    }
  };

  const handleCodeBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editorRef.current?.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3 
      ? container.parentElement 
      : container as HTMLElement;
    
    // Check if we're already in a code block
    const isInPre = element?.tagName === 'PRE' || element?.closest('pre');
    
    if (isInPre) {
      // Convert code block back to normal text
      const preElement = element.tagName === 'PRE' ? element : element.closest('pre');
      if (preElement) {
        const codeElement = preElement.querySelector('code');
        const text = codeElement ? codeElement.textContent : preElement.textContent;
        const textNode = document.createTextNode(text || '');
        preElement.parentNode?.replaceChild(textNode, preElement);
        onChange(editorRef.current?.innerHTML || "");
        editorRef.current?.focus();
        return;
      }
    }

    // Create code block
    try {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      pre.style.fontFamily = 'monospace';
      pre.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      pre.style.padding = '12px';
      pre.style.borderRadius = '4px';
      pre.style.overflowX = 'auto';
      pre.style.whiteSpace = 'pre';
      pre.style.margin = '8px 0';
      
      if (range.collapsed) {
        // No selection, create empty code block
        code.appendChild(document.createTextNode(''));
        pre.appendChild(code);
        range.insertNode(pre);
        range.setStart(code, 0);
        range.collapse(true);
      } else {
        // Wrap selection in code block
        try {
          const contents = range.extractContents();
          code.appendChild(contents);
          pre.appendChild(code);
          range.insertNode(pre);
        } catch (e) {
          const text = range.toString();
          code.textContent = text;
          pre.appendChild(code);
          range.insertNode(pre);
        }
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      onChange(editorRef.current?.innerHTML || "");
      editorRef.current?.focus();
    } catch (error) {
      console.error("Error applying code block:", error);
    }
  };

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.findIndex(f => f.value === currentFontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      handleFontSize(FONT_SIZES[currentIndex + 1].value);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.findIndex(f => f.value === currentFontSize);
    if (currentIndex > 0) {
      handleFontSize(FONT_SIZES[currentIndex - 1].value);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border rounded-md bg-muted/50 flex-wrap">
        <Button
          type="button"
          variant={isBold ? "default" : "ghost"}
          size="sm"
          onClick={handleBold}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isItalic ? "default" : "ghost"}
          size="sm"
          onClick={handleItalic}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isCode ? "default" : "ghost"}
          size="sm"
          onClick={handleInlineCode}
          className="h-8 w-8 p-0"
          title="Inline Code (Ctrl+`)"
        >
          <Code className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isCodeBlock ? "default" : "ghost"}
          size="sm"
          onClick={handleCodeBlock}
          className="h-8 w-8 p-0"
          title="Code Block"
        >
          <Code2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={decreaseFontSize}
            className="h-8 w-8 p-0"
            title="Decrease font size"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1"
                title="Font size"
              >
                <Type className="h-4 w-4" />
                <span className="text-xs">{currentFontSize}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => handleFontSize(size.value)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent",
                      currentFontSize === size.value && "bg-accent font-medium"
                    )}
                  >
                    {size.label} ({size.value})
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={increaseFontSize}
            className="h-8 w-8 p-0"
            title="Increase font size"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
              title="Text color"
            >
              <Palette className="h-4 w-4" />
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: currentColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-2 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColor(color.value)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                    currentColor === color.value && "bg-accent font-medium"
                  )}
                >
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color.value }}
                  />
                  <span>{color.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
          // Handle keyboard shortcuts
          if ((e.ctrlKey || e.metaKey) && e.key === "b") {
            e.preventDefault();
            handleBold();
          } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
            e.preventDefault();
            handleItalic();
          } else if ((e.ctrlKey || e.metaKey) && e.key === "`") {
            e.preventDefault();
            handleInlineCode();
          } else if (onKeyDown) {
            onKeyDown(e);
          }
        }}
        className={cn(
          "min-h-[200px] p-3 border rounded-md",
          "font-sans leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "overflow-y-auto resize-y",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground",
          "prose prose-sm max-w-none"
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};

