import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';

interface AdminInterfaceProps {
  onClose: () => void;
}

export const AdminInterface: React.FC<AdminInterfaceProps> = ({ onClose }) => {
  const [query, setQuery] = useState('SELECT name FROM sqlite_master WHERE type="table"');
  const [results, setResults] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) {
      setResults('Please enter a query to execute.');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await apiClient.debugQuery(query);

      if (response.error) {
        setResults(`Error: ${response.error}`);
      } else {
        const formattedResults = JSON.stringify({
          query: response.query,
          count: response.count,
          timestamp: response.timestamp,
          results: response.results
        }, null, 2);
        setResults(formattedResults);
      }
    } catch (error) {
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setResults('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl/Cmd + Enter to execute query
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="admin-interface">
      <div className="admin-interface-overlay" onClick={onClose}></div>
      <div className="admin-interface-modal">
        <div className="admin-interface-header">
          <h2>Database Administration</h2>
          <button
            className="admin-close-btn"
            onClick={onClose}
            title="Close Admin Interface"
          >
            ×
          </button>
        </div>

        <div className="admin-interface-body">
          <div className="admin-query-section">
            <label htmlFor="admin-query">SQL Query:</label>
            <textarea
              id="admin-query"
              className="admin-query-textarea"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your SQL query here..."
              rows={6}
            />
            <div className="admin-query-help">
              <small>Tip: Use Ctrl/Cmd + Enter to execute the query</small>
            </div>
          </div>

          <div className="admin-controls">
            <button
              className="admin-execute-btn"
              onClick={handleExecute}
              disabled={isExecuting || !query.trim()}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>
            <button
              className="admin-clear-btn"
              onClick={handleClear}
              disabled={!results}
            >
              Clear
            </button>
            <button
              className="admin-close-btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="admin-results-section">
            <label htmlFor="admin-results">Query Results:</label>
            <textarea
              id="admin-results"
              className="admin-results-textarea"
              value={results}
              readOnly
              placeholder="Query results will appear here..."
              rows={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInterface;