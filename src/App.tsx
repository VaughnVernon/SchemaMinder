import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { HierarchyTree } from './components/HierarchyTree';
import { FindModal } from './components/FindModal';
import { FilterModal, StatusFilter } from './components/FilterModal';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SourceCodeGenerationModal } from './components/SourceCodeGenerationModal';
import { ContentPanel } from './components/ContentPanel';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { useSchemaRegistry } from './hooks/useSchemaRegistry';
import { useRealTimeUpdates, RealTimeMessage } from './hooks/useRealTimeUpdates';
import { useHierarchyTree } from './hooks/useHierarchyTree';
import { useInitialHierarchySetup } from './hooks/useInitialHierarchySetup';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { useVersionAutoUpdate } from './hooks/useVersionAutoUpdate';
import { useHierarchyHandlers } from './hooks/useHierarchyHandlers';
import { useModalHandlers } from './hooks/useModalHandlers';
import { useToast } from './hooks/useToast';
import { useCodeGeneration } from './hooks/useCodeGeneration';
import { realTimeManager } from './services/realTimeManager';
import { useAppEventHandlers } from './appEventHandlers';
import { useSubscriptionState } from './hooks/useSubscriptionState';
import { useChangeNotifications } from './hooks/useChangeNotifications';
import { Schema, SchemaVersion, Product, Domain, Context, SchemaStatus, SchemaTypeCategory } from './types/schema';
import { sortRegistryData } from './services/schemaRegistry';

type ViewMode = 'tree' | 'create-product' | 'create-domain' | 'create-context' | 'create-schema' | 'create-version' | 'edit-product' | 'edit-domain' | 'edit-context' | 'edit-schema' | 'edit-version';


const App: React.FC = () => {
  const { authState } = useAuth();
  const toast = useToast();
  const {
    registry,
    loading,
    error,
    tenantInfo,
    addProduct,
    addDomain,
    addContext,
    addSchema,
    addSchemaVersion,
    updateProduct,
    updateDomain,
    updateContext,
    updateSchema,
    updateSchemaVersion,
    clearError,
    reload
  } = useSchemaRegistry();

  // Initialize subscription state management
  const subscriptionState = useSubscriptionState(authState.isAuthenticated);

  // Initialize change notifications hook
  useChangeNotifications();

  // Create a sorted version of the registry data for tree display
  const sortedRegistry = useMemo(() => ({
    ...registry,
    products: sortRegistryData(registry.products)
  }), [registry]);

  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SchemaVersion | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string>('');
  const [preselectedCategory, setPreselectedCategory] = useState<SchemaTypeCategory | undefined>();
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentDomainId, setCurrentDomainId] = useState<string>('');
  const [currentProductName, setCurrentProductName] = useState<string>('');
  const [currentDomainName, setCurrentDomainName] = useState<string>('');
  const [currentContextName, setCurrentContextName] = useState<string>('');
  const [currentSchemaId, setCurrentSchemaId] = useState<string>('');
  const [currentSchemaName, setCurrentSchemaName] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [editingSchema, setEditingSchema] = useState<Schema | null>(null);
  const [editingVersion, setEditingVersion] = useState<SchemaVersion | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>({
    [SchemaStatus.Draft]: true,
    [SchemaStatus.Published]: true,
    [SchemaStatus.Deprecated]: true,
    [SchemaStatus.Removed]: true
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Automatically show auth modal when not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.isLoading) {
      setIsAuthModalOpen(true);
    } else if (authState.isAuthenticated) {
      setIsAuthModalOpen(false);
    }
  }, [authState.isAuthenticated, authState.isLoading]);

  // Modal handlers hook
  const modalHandlers = useModalHandlers();

  // Code generation hook
  const codeGeneration = useCodeGeneration();

  // Real-time updates hook
  const { isConnected, sendMessage } = useRealTimeUpdates({
    tenantId: tenantInfo.tenantId,
    registryId: tenantInfo.registryId,
    onMessage: (message: RealTimeMessage) => {
      console.log('Received real-time update:', message);

      // Refresh data when we receive updates from other users
      if (realTimeManager.isActionable(message)) {
        // Only refresh if the message was sent by someone else
        console.log('Refreshing data due to external changes:', message.type);

        // Check if this is a version update that affects the currently open form
        const isVersionUpdate = realTimeManager.isVersionUpdate(message);
        const isEditingVersion = viewMode === 'edit-version' && editingVersion && selectedSchema;

        if (isVersionUpdate && isEditingVersion && realTimeManager.hasData(message)) {
          // Check if the update is for the currently editing version
          const isCurrentVersion = (
            realTimeManager.isSameVersion(message, editingVersion.id) ||
            (realTimeManager.isSameSchema(message, selectedSchema.id) &&
             realTimeManager.isSameSemanticVersion(message, editingVersion.semanticVersion))
          );

          if (isCurrentVersion) {
            console.log('Detected real-time update for currently editing schema version');
          }
        }

        // Trigger general data refresh without full page reload to preserve UI state
        reload();
      }
    },
    onConnect: () => {
      console.log('Connected to real-time updates');
    },
    onDisconnect: () => {
      console.log('Disconnected from real-time updates');
    },
    onError: (error) => {
      console.error('Real-time updates error:', error);
    }
  });

  // Hierarchy tree state and handlers
  const {
    state: hierarchyState,
    callbacks: hierarchyCallbacks,
    stateHandlers: hierarchyStateHandlers,
    actions: hierarchyActions
  } = useHierarchyTree({
    products: sortedRegistry.products,
    statusFilter,
    onFind: modalHandlers.showFindModal,
    onFilter: modalHandlers.showFilterModal
  });


  // Create all event handlers using the unified hook
  const handlers = useAppEventHandlers({
    // Registry data
    registry,
    sortedRegistry,

    // Hierarchy state
    hierarchyState,

    // Editing states
    editingProduct,
    editingDomain,
    editingContext,
    editingSchema,
    editingVersion,

    // Current IDs
    currentProductId,
    currentDomainId,
    currentContextId,
    currentSchemaId,

    // Current names
    currentProductName,
    currentDomainName,
    currentContextName,
    currentSchemaName,

    // Status filter
    statusFilter,

    // Registry operations
    addProduct,
    addDomain,
    addContext,
    addSchema,
    addSchemaVersion,
    updateProduct,
    updateDomain,
    updateContext,
    updateSchema,
    updateSchemaVersion,

    // State setters
    setViewMode,
    setCurrentProductId,
    setCurrentDomainId,
    setCurrentContextId,
    setCurrentSchemaId,
    setCurrentProductName,
    setCurrentDomainName,
    setCurrentContextName,
    setCurrentSchemaName,
    setEditingProduct,
    setEditingDomain,
    setEditingContext,
    setEditingSchema,
    setEditingVersion,
    selectedSchema,
    setSelectedSchema,
    selectedVersion,
    setSelectedVersion,
    setStatusFilter,
    setPreselectedCategory,

    // Hierarchy actions
    hierarchyActions,

    // Real-time messaging
    sendMessage,

    // Modal functions
    showFindModal: modalHandlers.showFindModal,
    showFilterModal: modalHandlers.showFilterModal,
    showMessageModal: modalHandlers.showMessageModal,

    // Subscription state
    subscriptionState,

    // Toast notifications
    showToastSuccess: toast.showSuccess,
    showToastError: toast.showError

  });

  // Hierarchy handlers hook
  const hierarchyHandlers = useHierarchyHandlers({
    handlers: {
      ...handlers,
      handleGenerateCode: (context: Context) => {
        codeGeneration.openGenerateModal(context, sortedRegistry.products);
      }
    },
    hierarchyActions,
    setViewMode,
    setSelectedSchema,
    setEditingVersion
  });

  // Auto-setup hooks
  useInitialHierarchySetup({
    products: sortedRegistry.products,
    currentContextId,
    setCurrentContextId,
    setExpandedItems: hierarchyActions.setExpandedItems
  });

  useGlobalKeyboardShortcuts({
    onFind: modalHandlers.showFindModal
  });

  useVersionAutoUpdate({
    registry,
    viewMode,
    editingVersion,
    selectedSchema,
    setEditingVersion,
    setSelectedSchema
  });



  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-message">
          <h2>Loading Schema Minder...</h2>
          <p>Tenant: {tenantInfo.tenantId}</p>
          <p>Registry: {tenantInfo.registryId}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header registry={registry} />

      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      {/* Only show main content when authenticated */}
      {authState.isAuthenticated && (
        <main className="main-container">
          <div className="tree-panel">
            <HierarchyTree
              state={hierarchyState}
              callbacks={hierarchyCallbacks}
              handlers={hierarchyHandlers}
              stateHandlers={hierarchyStateHandlers}
              subscriptionState={subscriptionState}
            />
          </div>

          <div className="content-panel">
            <ContentPanel
            viewMode={viewMode}
            selectedItem={hierarchyState.selectedItem}
            registry={registry}
            selectedSchema={selectedSchema}
            selectedVersion={selectedVersion}
            editingProduct={editingProduct}
            editingDomain={editingDomain}
            editingContext={editingContext}
            editingSchema={editingSchema}
            editingVersion={editingVersion}
            currentProductId={currentProductId}
            currentDomainId={currentDomainId}
            currentContextId={currentContextId}
            currentProductName={currentProductName}
            currentDomainName={currentDomainName}
            preselectedCategory={preselectedCategory}
            handlers={handlers}
            setViewMode={setViewMode}
            setPreselectedCategory={setPreselectedCategory}
            setSelectedItem={hierarchyActions.setSelectedItem}
            />
          </div>
        </main>
      )}

      {/* Only show modals and connection status when authenticated */}
      {authState.isAuthenticated && (
        <>
          <FindModal
            isOpen={modalHandlers.isFindOpen}
            onClose={modalHandlers.handleFindClose}
            onFind={handlers.handleFindQuery}
            onSelectResult={handlers.handleFindSelect}
            selectedItemId={hierarchyState.selectedItem?.id}
            query={modalHandlers.findQuery}
            onQueryChange={modalHandlers.setFindQuery}
            results={modalHandlers.findResults}
            onResultsChange={modalHandlers.setFindResults}
          />

          <FilterModal
            isOpen={modalHandlers.isFilterOpen}
            currentFilter={statusFilter}
            onApply={handlers.handleFilterApply}
            onClose={modalHandlers.handleFilterClose}
            mousePosition={modalHandlers.filterMousePosition}
          />

          {codeGeneration.generationContext && (
            <SourceCodeGenerationModal
              isOpen={codeGeneration.isModalOpen}
              contextPath={codeGeneration.contextPath}
              context={codeGeneration.generationContext}
              onClose={codeGeneration.closeGenerateModal}
              onGenerate={codeGeneration.handleGenerate}
            />
          )}

          <ConnectionStatus isConnected={isConnected} />
        </>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          // Only allow closing if authenticated
          if (authState.isAuthenticated) {
            setIsAuthModalOpen(false);
          }
        }}
      />

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
};

export default App;