import { useEffect } from 'react';

interface KeyboardShortcuts {
  onStartTimer?: () => void;
  onResetTimer?: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onToggleSound?: () => void;
}

export function useKeyboardShortcuts({
  onStartTimer,
  onResetTimer,
  onOpenSettings,
  onOpenHistory,
  onToggleSound
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      switch (event.key.toLowerCase()) {
        case ' ':
          // Spacebar - Start/Stop timer
          event.preventDefault();
          onStartTimer?.();
          break;
        
        case 'r':
          if (isCtrl) {
            // Ctrl+R - Reset timer (prevent page refresh)
            event.preventDefault();
            onResetTimer?.();
          }
          break;
        
        case ',':
          if (isCtrl) {
            // Ctrl+, - Open settings
            event.preventDefault();
            onOpenSettings?.();
          }
          break;
        
        case 'h':
          if (isCtrl) {
            // Ctrl+H - Open history
            event.preventDefault();
            onOpenHistory?.();
          }
          break;
        
        case 'm':
          if (isCtrl) {
            // Ctrl+M - Toggle sound
            event.preventDefault();
            onToggleSound?.();
          }
          break;
        
        case 'escape':
          // ESC - Close modals (handled by modal components)
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onStartTimer, onResetTimer, onOpenSettings, onOpenHistory, onToggleSound]);
}

// Keyboard shortcuts help data
export const keyboardShortcuts = [
  { key: 'Space', description: 'Start/Stop Timer' },
  { key: 'Ctrl+R', description: 'Reset Timer' },
  { key: 'Ctrl+,', description: 'Settings' },
  { key: 'Ctrl+H', description: 'History' },
  { key: 'Ctrl+M', description: 'Toggle Sound' }
];