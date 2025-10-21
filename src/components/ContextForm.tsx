import React, { useState, useEffect } from 'react';
import { Context } from '../types/schema';
import { DialogMode } from '../types/dialogMode';
import { Circle } from 'lucide-react';

interface ContextFormProps {
  mode: DialogMode;
  context?: Context; // Only required for Edit mode
  domainId?: string; // Only required for New mode
  domainName?: string; // Only required for New mode
  onSubmit: (data: { name: string; namespace?: string; description?: string }) => void;
  onCancel: () => void;
}

export const ContextForm: React.FC<ContextFormProps> = ({
  mode,
  context,
  domainId,
  domainName,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form fields based on mode
  useEffect(() => {
    if (mode === DialogMode.Edit && context) {
      setName(context.name);
      setNamespace(context.namespace || '');
      setDescription(context.description || '');
    } else {
      setName('');
      setNamespace('');
      setDescription('');
    }
  }, [mode, context]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save/create
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (name.trim()) {
          onSubmit({
            name: name.trim(),
            namespace: namespace.trim() || undefined,
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
  }, [name, namespace, description, onSubmit, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        namespace: namespace.trim() || undefined,
        description: description.trim() || undefined
      });
    }
  };

  const isEditMode = mode === DialogMode.Edit;
  const title = isEditMode ? 'Edit Context' : 'New Context';
  const submitButtonText = isEditMode ? 'Save' : 'Create';

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Circle size={20} />
        {title}
      </h3>
      {!isEditMode && domainName && (
        <p>Domain: <strong>{domainName}</strong></p>
      )}

      <div className="form-group">
        <label htmlFor="context-name">Context Name:</label>
        <input
          type="text"
          id="context-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter context name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="context-namespace">Namespace:</label>
        <input
          type="text"
          id="context-namespace"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          placeholder="Enter context namespace"
        />
      </div>

      <div className="form-group">
        <label htmlFor="context-description">Description:</label>
        <textarea
          id="context-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter optional context description"
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