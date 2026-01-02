import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddTabDialogProps {
  onAdd: (title: string) => Promise<string | void>;
  isCreating: boolean;
}

export const AddTabDialog = ({ onAdd, isCreating }: AddTabDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) return;
    await onAdd(title.trim());
    setTitle("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Tab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Tab</DialogTitle>
          <DialogDescription>
            Create a new script tab. It will use the same format as Greeting/Closing scripts.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tab title (e.g., Follow-up, Rebuttals)"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!title.trim() || isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
