import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSchemaVersionInitialization, useSchemaVersionInitializationWithState } from '../../src/hooks/schemaVersion/useSchemaVersionInitialization';
import { SchemaVersion, SchemaStatus } from '../../src/types/schema';
import { DialogMode } from '../../src/types/dialogMode';

// Mock the prepareSpecificationWithTodo function
vi.mock('../../src/services/specificationTodoProcessor', () => ({
  prepareSpecificationWithTodo: vi.fn((spec) => {
    if (!spec || spec.trim() === '') {
      return '// TODO: Add specification';
    }
    return `${spec}\n// TODO: Complete implementation`;
  })
}));

import { prepareSpecificationWithTodo } from '../../src/services/specificationTodoProcessor';

describe('useSchemaVersionInitialization', () => {
  let mockSetters: {
    setSpecification: ReturnType<typeof vi.fn>;
    setSemanticVersion: ReturnType<typeof vi.fn>;
    setDescription: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
  };

  // Mock data
  const mockSchemaVersion: SchemaVersion = {
    id: 'version-1',
    semanticVersion: '2.1.0',
    specification: 'event UserUpdated { id: string, name: string }',
    description: 'Updated user schema with validation',
    status: SchemaStatus.Published,
    createdAt: '2023-01-01T10:00:00Z',
    lastUpdatedAt: '2023-01-01T11:00:00Z',
    schemaId: 'schema-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock setter functions for each test
    mockSetters = {
      setSpecification: vi.fn(),
      setSemanticVersion: vi.fn(),
      setDescription: vi.fn(),
      setStatus: vi.fn()
    };

    // Reset the mock implementation
    (prepareSpecificationWithTodo as any).mockImplementation((spec) => {
      if (!spec || spec.trim() === '') {
        return '// TODO: Add specification';
      }
      return `${spec}\n// TODO: Complete implementation`;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Edit mode initialization', () => {
    it('should initialize form with existing schema version data', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.Edit,
        schemaVersion: mockSchemaVersion,
        suggestedVersion: '3.0.0',
        previousSpecification: 'event OldSpec {}',
        ...mockSetters
      }));

      // Should use existing schema version data
      expect(mockSetters.setSpecification).toHaveBeenCalledWith('event UserUpdated { id: string, name: string }');
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('2.1.0');
      expect(mockSetters.setDescription).toHaveBeenCalledWith('Updated user schema with validation');
      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Published);
    });

    it('should handle schema version with empty description', () => {
      const schemaVersionWithoutDescription = {
        ...mockSchemaVersion,
        description: undefined
      };

      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.Edit,
        schemaVersion: schemaVersionWithoutDescription,
        suggestedVersion: '3.0.0',
        previousSpecification: 'event OldSpec {}',
        ...mockSetters
      }));

      expect(mockSetters.setDescription).toHaveBeenCalledWith('');
    });

    it('should handle schema version with null description', () => {
      const schemaVersionWithNullDescription = {
        ...mockSchemaVersion,
        description: null as any
      };

      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.Edit,
        schemaVersion: schemaVersionWithNullDescription,
        suggestedVersion: '3.0.0',
        previousSpecification: 'event OldSpec {}',
        ...mockSetters
      }));

      expect(mockSetters.setDescription).toHaveBeenCalledWith('');
    });

    it('should ignore suggested version and previous specification in edit mode', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.Edit,
        schemaVersion: mockSchemaVersion,
        suggestedVersion: '9.9.9',
        previousSpecification: 'event IgnoredSpec {}',
        ...mockSetters
      }));

      // Should not use suggested version or previous specification
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('2.1.0');
      expect(mockSetters.setSpecification).toHaveBeenCalledWith('event UserUpdated { id: string, name: string }');
    });

    it('should handle different schema statuses correctly', () => {
      const testStatuses = [
        SchemaStatus.Draft,
        SchemaStatus.Published,
        SchemaStatus.Deprecated,
        SchemaStatus.Removed
      ];

      testStatuses.forEach(status => {
        vi.clearAllMocks();
        const schemaWithStatus = { ...mockSchemaVersion, status };

        renderHook(() => useSchemaVersionInitialization({
          mode: DialogMode.Edit,
          schemaVersion: schemaWithStatus,
          suggestedVersion: '3.0.0',
          previousSpecification: 'event OldSpec {}',
          ...mockSetters
        }));

        expect(mockSetters.setStatus).toHaveBeenCalledWith(status);
      });
    });
  });

  describe('New mode initialization', () => {
    it('should initialize form for new version with previous specification', () => {
      const previousSpec = 'event UserCreated { id: string }';

      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.2.0',
        previousSpecification: previousSpec,
        ...mockSetters
      }));

      // Should prepare specification with TODO
      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith(previousSpec);
      expect(mockSetters.setSpecification).toHaveBeenCalledWith('event UserCreated { id: string }\n// TODO: Complete implementation');
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('1.2.0');
      expect(mockSetters.setDescription).toHaveBeenCalledWith('');
      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });

    it('should initialize form for new version without previous specification', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.0.0',
        previousSpecification: undefined,
        ...mockSetters
      }));

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith(undefined);
      expect(mockSetters.setSpecification).toHaveBeenCalledWith('// TODO: Add specification');
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('1.0.0');
      expect(mockSetters.setDescription).toHaveBeenCalledWith('');
      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });

    it('should handle empty previous specification', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.0.0',
        previousSpecification: '',
        ...mockSetters
      }));

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith('');
      expect(mockSetters.setSpecification).toHaveBeenCalledWith('// TODO: Add specification');
    });

    it('should handle undefined suggested version', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: undefined,
        previousSpecification: 'event Test {}',
        ...mockSetters
      }));

      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('');
    });

    it('should handle empty suggested version', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '',
        previousSpecification: 'event Test {}',
        ...mockSetters
      }));

      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('');
    });

    it('should ignore schema version parameter in new mode', () => {
      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: mockSchemaVersion, // Should be ignored
        suggestedVersion: '1.0.0',
        previousSpecification: 'event Test {}',
        ...mockSetters
      }));

      // Should not use schema version data
      expect(mockSetters.setSpecification).not.toHaveBeenCalledWith(mockSchemaVersion.specification);
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('1.0.0');
      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });
  });

  describe('Effect dependency changes', () => {
    it('should re-initialize when mode changes from New to Edit', () => {
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.New,
          schemaVersion: undefined,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Test {}',
          ...mockSetters
        }
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Change to edit mode
      rerender({
        mode: DialogMode.Edit,
        schemaVersion: mockSchemaVersion,
        suggestedVersion: '1.0.0',
        previousSpecification: 'event Test {}',
        ...mockSetters
      });

      // Should initialize with schema version data
      expect(mockSetters.setSpecification).toHaveBeenCalledWith(mockSchemaVersion.specification);
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith(mockSchemaVersion.semanticVersion);
    });

    it('should re-initialize when schema version changes in edit mode', () => {
      const updatedSchemaVersion = {
        ...mockSchemaVersion,
        semanticVersion: '3.0.0',
        specification: 'event UpdatedSpec { newField: string }'
      };

      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.Edit,
          schemaVersion: mockSchemaVersion,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Test {}',
          ...mockSetters
        }
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Update schema version
      rerender({
        mode: DialogMode.Edit,
        schemaVersion: updatedSchemaVersion,
        suggestedVersion: '1.0.0',
        previousSpecification: 'event Test {}',
        ...mockSetters
      });

      expect(mockSetters.setSpecification).toHaveBeenCalledWith('event UpdatedSpec { newField: string }');
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('3.0.0');
    });

    it('should re-initialize when suggested version changes in new mode', () => {
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.New,
          schemaVersion: undefined,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Test {}',
          ...mockSetters
        }
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Update suggested version
      rerender({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '2.0.0',
        previousSpecification: 'event Test {}',
        ...mockSetters
      });

      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('2.0.0');
    });

    it('should re-initialize when previous specification changes in new mode', () => {
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.New,
          schemaVersion: undefined,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Test {}',
          ...mockSetters
        }
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Update previous specification
      rerender({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.0.0',
        previousSpecification: 'event UpdatedTest { newField: number }',
        ...mockSetters
      });

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith('event UpdatedTest { newField: number }');
    });
  });

  describe('useSchemaVersionInitializationWithState', () => {
    it('should work with form state object', () => {
      const mockFormState = {
        setSpecification: vi.fn(),
        setSemanticVersion: vi.fn(),
        setDescription: vi.fn(),
        setStatus: vi.fn()
      };

      renderHook(() => useSchemaVersionInitializationWithState(
        DialogMode.Edit,
        mockSchemaVersion,
        '1.0.0',
        'event Test {}',
        mockFormState
      ));

      expect(mockFormState.setSpecification).toHaveBeenCalledWith(mockSchemaVersion.specification);
      expect(mockFormState.setSemanticVersion).toHaveBeenCalledWith(mockSchemaVersion.semanticVersion);
      expect(mockFormState.setDescription).toHaveBeenCalledWith(mockSchemaVersion.description);
      expect(mockFormState.setStatus).toHaveBeenCalledWith(mockSchemaVersion.status);
    });

    it('should handle new mode with form state object', () => {
      const mockFormState = {
        setSpecification: vi.fn(),
        setSemanticVersion: vi.fn(),
        setDescription: vi.fn(),
        setStatus: vi.fn()
      };

      renderHook(() => useSchemaVersionInitializationWithState(
        DialogMode.New,
        undefined,
        '1.5.0',
        'event InitialSpec {}',
        mockFormState
      ));

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith('event InitialSpec {}');
      expect(mockFormState.setSpecification).toHaveBeenCalledWith('event InitialSpec {}\n// TODO: Complete implementation');
      expect(mockFormState.setSemanticVersion).toHaveBeenCalledWith('1.5.0');
      expect(mockFormState.setDescription).toHaveBeenCalledWith('');
      expect(mockFormState.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });

    it('should handle undefined values properly', () => {
      const mockFormState = {
        setSpecification: vi.fn(),
        setSemanticVersion: vi.fn(),
        setDescription: vi.fn(),
        setStatus: vi.fn()
      };

      renderHook(() => useSchemaVersionInitializationWithState(
        DialogMode.New,
        undefined,
        undefined,
        undefined,
        mockFormState
      ));

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith(undefined);
      expect(mockFormState.setSemanticVersion).toHaveBeenCalledWith('');
      expect(mockFormState.setDescription).toHaveBeenCalledWith('');
      expect(mockFormState.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle rapid prop changes gracefully', () => {
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.New,
          schemaVersion: undefined,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Test {}',
          ...mockSetters
        }
      });

      // Rapidly change props multiple times
      for (let i = 0; i < 5; i++) {
        rerender({
          mode: i % 2 === 0 ? DialogMode.New : DialogMode.Edit,
          schemaVersion: i % 2 === 0 ? undefined : mockSchemaVersion,
          suggestedVersion: `${i}.0.0`,
          previousSpecification: `event Test${i} {}`,
          ...mockSetters
        });
      }

      // Should have been called multiple times without errors
      expect(mockSetters.setSemanticVersion).toHaveBeenCalled();
      expect(mockSetters.setSpecification).toHaveBeenCalled();
    });

    it('should handle mock edge cases properly', () => {
      // Test with undefined specification to ensure mock works correctly
      (prepareSpecificationWithTodo as any).mockReturnValueOnce('// Custom mock result');

      renderHook(() => useSchemaVersionInitialization({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.0.0',
        previousSpecification: undefined,
        ...mockSetters
      }));

      expect(mockSetters.setSpecification).toHaveBeenCalledWith('// Custom mock result');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete new version workflow', () => {
      // Step 1: Initialize new version
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.New,
          schemaVersion: undefined,
          suggestedVersion: '1.0.0',
          previousSpecification: undefined,
          ...mockSetters
        }
      });

      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('1.0.0');

      // Step 2: Add previous specification
      vi.clearAllMocks();
      rerender({
        mode: DialogMode.New,
        schemaVersion: undefined,
        suggestedVersion: '1.0.0',
        previousSpecification: 'event BaseEvent { id: string }',
        ...mockSetters
      });

      expect(prepareSpecificationWithTodo).toHaveBeenCalledWith('event BaseEvent { id: string }');
    });

    it('should handle complete edit version workflow', () => {
      // Step 1: Initialize edit mode
      const { rerender } = renderHook((props) => useSchemaVersionInitialization(props), {
        initialProps: {
          mode: DialogMode.Edit,
          schemaVersion: mockSchemaVersion,
          suggestedVersion: '1.0.0',
          previousSpecification: 'event Ignored {}',
          ...mockSetters
        }
      });

      expect(mockSetters.setSpecification).toHaveBeenCalledWith(mockSchemaVersion.specification);
      expect(mockSetters.setStatus).toHaveBeenCalledWith(mockSchemaVersion.status);

      // Step 2: Update to different schema version
      vi.clearAllMocks();
      const newMockVersion = {
        ...mockSchemaVersion,
        id: 'version-2',
        semanticVersion: '2.2.0',
        status: SchemaStatus.Draft
      };

      rerender({
        mode: DialogMode.Edit,
        schemaVersion: newMockVersion,
        suggestedVersion: '1.0.0',
        previousSpecification: 'event Ignored {}',
        ...mockSetters
      });

      expect(mockSetters.setSemanticVersion).toHaveBeenCalledWith('2.2.0');
      expect(mockSetters.setStatus).toHaveBeenCalledWith(SchemaStatus.Draft);
    });
  });
});