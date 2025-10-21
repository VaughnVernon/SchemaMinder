import { useEffect } from 'react';
import { Schema, SchemaVersion, SchemaRegistry } from '../types/schema';

type ViewMode = 'tree' | 'create-product' | 'create-domain' | 'create-context' | 'create-schema' | 'create-version' | 'edit-product' | 'edit-domain' | 'edit-context' | 'edit-schema' | 'edit-version';

interface UseVersionAutoUpdateProps {
  registry: SchemaRegistry;
  viewMode: ViewMode;
  editingVersion: SchemaVersion | null;
  selectedSchema: Schema | null;
  setEditingVersion: (version: SchemaVersion) => void;
  setSelectedSchema: (schema: Schema) => void;
}

/**
 * Custom hook to auto-update form when registry data changes for the currently editing version.
 * This ensures real-time updates are reflected in the form when other users make changes.
 */
export const useVersionAutoUpdate = ({
  registry,
  viewMode,
  editingVersion,
  selectedSchema,
  setEditingVersion,
  setSelectedSchema
}: UseVersionAutoUpdateProps) => {
  useEffect(() => {
    if (viewMode === 'edit-version' && editingVersion && selectedSchema) {
      // Find the updated version in the latest registry data
      const updatedSchema = registry.products
        .flatMap(p => p.domains)
        .flatMap(d => d.contexts)
        .flatMap(c => c.schemas)
        .find(s => s.id === selectedSchema.id);

      if (updatedSchema) {
        const updatedVersion = updatedSchema.versions.find(v => v.id === editingVersion.id);
        if (updatedVersion) {
          // Only update if the data has actually changed (to avoid infinite loops)
          if (JSON.stringify(updatedVersion) !== JSON.stringify(editingVersion) ||
              JSON.stringify(updatedSchema) !== JSON.stringify(selectedSchema)) {
            console.log('Auto-updating form with latest schema version data');
            setEditingVersion(updatedVersion);
            setSelectedSchema(updatedSchema);
          }
        }
      }
    }
  }, [registry, viewMode, editingVersion?.id, selectedSchema?.id, setEditingVersion, setSelectedSchema]);
};