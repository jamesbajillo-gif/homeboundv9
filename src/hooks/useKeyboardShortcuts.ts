import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useKeyboardShortcuts = (onPasswordDialogOpen?: () => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
      const isModifier = event.ctrlKey || event.metaKey;

      if (!isModifier) return;

      // Ctrl+K - Open password dialog
      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        if (location.pathname !== '/settings') {
          onPasswordDialogOpen?.();
        }
      }

      // Ctrl+X - Close settings (go back to home)
      if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        if (location.pathname === '/settings') {
          navigate('/');
        }
      }

      // Ctrl+S - Save settings (trigger custom event)
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        if (location.pathname === '/settings') {
          // Dispatch a custom event that settings components can listen to
          window.dispatchEvent(new CustomEvent('save-settings-shortcut'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, location, onPasswordDialogOpen]);
};
