import React, { useState, useEffect } from 'react';
import { Product } from '../types/schema';
import { DialogMode } from '../types/dialogMode';
import { Box } from 'lucide-react';

interface ProductFormProps {
  mode: DialogMode;
  product?: Product; // Only required for Edit mode
  onSubmit: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  mode,
  product,
  onSubmit, 
  onCancel 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form fields when in edit mode
  useEffect(() => {
    if (mode === DialogMode.Edit && product) {
      setName(product.name);
      setDescription(product.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [mode, product]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save/create
      if (event.ctrlKey && event.key === 's') {
        console.log('ProductForm: Ctrl+S detected');
        event.preventDefault();
        if (name.trim()) {
          console.log('ProductForm: Ctrl+S calling onSubmit with:', {
            name: name.trim(),
            description: description.trim() || undefined
          });
          onSubmit({
            name: name.trim(),
            description: description.trim() || undefined
          });
        } else {
          console.log('ProductForm: Ctrl+S - name is empty, not submitting');
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
    console.log('ProductForm handleSubmit called');
    e.preventDefault();
    if (name.trim()) {
      console.log('ProductForm calling onSubmit with:', {
        name: name.trim(),
        description: description.trim() || undefined
      });
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined
      });
    } else {
      console.log('ProductForm: name is empty, not submitting');
    }
  };

  const isEditMode = mode === DialogMode.Edit;
  const title = isEditMode ? 'Edit Product' : 'New Product';
  const submitButtonText = isEditMode ? 'Save' : 'Create';

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Box size={20} />
        {title}
      </h3>
      
      <div className="form-group">
        <label htmlFor="product-name">Product Name:</label>
        <input
          type="text"
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="product-description">Description:</label>
        <textarea
          id="product-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter optional product description"
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