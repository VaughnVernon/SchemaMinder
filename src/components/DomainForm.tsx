import React, { useState, useEffect } from 'react';
import { Domain } from '../types/schema';
import { DialogMode } from '../types/dialogMode';
import { Waypoints } from 'lucide-react';

interface DomainFormProps {
  mode: DialogMode;
  domain?: Domain; // Only required for Edit mode
  productId?: string; // Only required for New mode
  productName?: string; // Only required for New mode
  onSubmit: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
}

export const DomainForm: React.FC<DomainFormProps> = ({
  mode,
  domain,
  productId,
  productName,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form fields based on mode
  useEffect(() => {
    if (mode === DialogMode.Edit && domain) {
      setName(domain.name);
      setDescription(domain.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [mode, domain]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save/create
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        console.log('DomainForm: Ctrl+S pressed', { name, description });
        if (name.trim()) {
          console.log('DomainForm: Calling onSubmit from keyboard shortcut');
          onSubmit({
            name: name.trim(),
            description: description.trim() || undefined
          });
        }
      }
      // Esc for cancel
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [name, description, onSubmit, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('DomainForm handleSubmit called', { name, description });
    if (name.trim()) {
      console.log('Calling onSubmit with:', {
        name: name.trim(),
        description: description.trim() || undefined
      });
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined
      });
    }
  };

  const isEditMode = mode === DialogMode.Edit;
  const title = isEditMode ? 'Edit Domain' : 'New Domain';
  const submitButtonText = isEditMode ? 'Save' : 'Create';

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Waypoints size={20} />
        {title}
      </h3>
      {!isEditMode && (
        <p>Product: <strong>{productName || ''}</strong></p>
      )}

      <div className="form-group">
        <label htmlFor="domain-name">Domain Name:</label>
        <input
          type="text"
          id="domain-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter domain name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="domain-description">Description:</label>
        <textarea
          id="domain-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter optional domain description"
          rows={2}
        />
      </div>

      <div>
        <button type="submit" className="button">{submitButtonText}</button>
        <button type="button" onClick={onCancel} className="button secondary">Cancel</button>
      </div>
    </form>
  );
};