import React, { useState, useRef, useEffect } from 'react';
import { Ellipsis } from 'lucide-react';

export interface MenuItem {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: (event?: React.MouseEvent) => void;
}

interface DropdownMenuProps {
  items: MenuItem[];
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number>();

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }


  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  return (
    <div 
      className={`dropdown-container ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={menuRef}
    >
      <button 
        className="dropdown-trigger"
        onClick={(e) => {
          // Allow Shift+Click to propagate for expand/collapse all functionality
          if (!e.shiftKey) {
            e.stopPropagation();
          }
          // Only open the menu on click, never close it from the button
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
      >
        <Ellipsis size={16} />
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {items.map((item, index) => (
            <button
              key={index}
              className="dropdown-item"
              onClick={(e) => {
                // Allow Shift+Click to propagate for expand/collapse all functionality
                if (!e.shiftKey) {
                  e.stopPropagation();
                }
                item.onClick(e);
                setIsOpen(false);
              }}
              title={item.tooltip}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};