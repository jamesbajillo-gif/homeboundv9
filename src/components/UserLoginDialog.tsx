import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { setLoggedInUser } from "@/lib/userHistory";

interface UserLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Password to user mapping
const PASSWORD_TO_USER: Record<string, string> = {
  "kainkatae": "000",      // Admin user
  "operation": "021",     // Operation user
  "test": "001",          // Default/standard user
};

export const UserLoginDialog = ({ open, onOpenChange, onSuccess }: UserLoginDialogProps) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmedPassword = password.toLowerCase().trim();
    const userId = PASSWORD_TO_USER[trimmedPassword];
    
    if (userId) {
      setLoggedInUser(userId);
      toast.success(`Logged in as user ${userId}`);
      onOpenChange(false);
      setPassword("");
      // Call onSuccess after a brief delay to ensure state is updated
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } else {
      toast.error("Invalid password");
      setPassword("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Login</AlertDialogTitle>
          <AlertDialogDescription>
            Enter password to log in. All actions will be tracked under your user account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            className="mt-2"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>Login</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

