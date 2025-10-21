import { useEffect } from 'react';

interface UseGlobalKeyboardShortcutsProps {
  onFind: () => void;
}

/**
 * Custom hook to handle global keyboard shortcuts.
 * Currently handles Ctrl+F (or Cmd+F on Mac) for find functionality.
 */
export const useGlobalKeyboardShortcuts = ({
  onFind
}: UseGlobalKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onFind();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onFind]);
};