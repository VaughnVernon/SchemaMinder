import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConnectionStatus } from '../../src/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('Connected State', () => {
    it('should render connected status correctly', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      expect(screen.getByText('Real-time updates: Connected')).toBeInTheDocument();
      
      const indicator = document.querySelector('.connection-indicator');
      expect(indicator).toHaveClass('connected');
      expect(indicator).not.toHaveClass('disconnected');
    });

    it('should have correct CSS structure for connected state', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      const container = document.querySelector('.connection-status');
      const indicator = document.querySelector('.connection-indicator');
      const dot = document.querySelector('.status-dot');
      const text = document.querySelector('.status-text');
      
      expect(container).toBeInTheDocument();
      expect(indicator).toBeInTheDocument();
      expect(dot).toBeInTheDocument();
      expect(text).toBeInTheDocument();
      
      expect(indicator).toHaveClass('connection-indicator', 'connected');
    });

    it('should render status text for connected state', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      const statusText = screen.getByText('Real-time updates: Connected');
      expect(statusText).toHaveClass('status-text');
    });
  });

  describe('Disconnected State', () => {
    it('should render disconnected status correctly', () => {
      render(<ConnectionStatus isConnected={false} />);
      
      expect(screen.getByText('Real-time updates: Disconnected')).toBeInTheDocument();
      
      const indicator = document.querySelector('.connection-indicator');
      expect(indicator).toHaveClass('disconnected');
      expect(indicator).not.toHaveClass('connected');
    });

    it('should have correct CSS structure for disconnected state', () => {
      render(<ConnectionStatus isConnected={false} />);
      
      const container = document.querySelector('.connection-status');
      const indicator = document.querySelector('.connection-indicator');
      const dot = document.querySelector('.status-dot');
      const text = document.querySelector('.status-text');
      
      expect(container).toBeInTheDocument();
      expect(indicator).toBeInTheDocument();
      expect(dot).toBeInTheDocument();
      expect(text).toBeInTheDocument();
      
      expect(indicator).toHaveClass('connection-indicator', 'disconnected');
    });

    it('should render status text for disconnected state', () => {
      render(<ConnectionStatus isConnected={false} />);
      
      const statusText = screen.getByText('Real-time updates: Disconnected');
      expect(statusText).toHaveClass('status-text');
    });
  });

  describe('State Transitions', () => {
    it('should update from connected to disconnected', () => {
      const { rerender } = render(<ConnectionStatus isConnected={true} />);
      
      expect(screen.getByText('Real-time updates: Connected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('connected');
      
      rerender(<ConnectionStatus isConnected={false} />);
      
      expect(screen.getByText('Real-time updates: Disconnected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('disconnected');
    });

    it('should update from disconnected to connected', () => {
      const { rerender } = render(<ConnectionStatus isConnected={false} />);
      
      expect(screen.getByText('Real-time updates: Disconnected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('disconnected');
      
      rerender(<ConnectionStatus isConnected={true} />);
      
      expect(screen.getByText('Real-time updates: Connected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('connected');
    });

    it('should maintain consistent DOM structure during state changes', () => {
      const { rerender } = render(<ConnectionStatus isConnected={true} />);
      
      const container = document.querySelector('.connection-status');
      const dot = document.querySelector('.status-dot');
      
      rerender(<ConnectionStatus isConnected={false} />);
      
      // Same elements should still exist
      expect(document.querySelector('.connection-status')).toBe(container);
      expect(document.querySelector('.status-dot')).toBe(dot);
    });
  });

  describe('Component Structure', () => {
    it('should have proper nested structure', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      const connectionStatus = document.querySelector('.connection-status');
      const connectionIndicator = connectionStatus?.querySelector('.connection-indicator');
      const statusDot = connectionIndicator?.querySelector('.status-dot');
      const statusText = connectionIndicator?.querySelector('.status-text');
      
      expect(connectionStatus).toBeInTheDocument();
      expect(connectionIndicator).toBeInTheDocument();
      expect(statusDot).toBeInTheDocument();
      expect(statusText).toBeInTheDocument();
    });

    it('should render only required elements', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      // Should have exactly these elements
      expect(document.querySelectorAll('.connection-status')).toHaveLength(1);
      expect(document.querySelectorAll('.connection-indicator')).toHaveLength(1);
      expect(document.querySelectorAll('.status-dot')).toHaveLength(1);
      expect(document.querySelectorAll('.status-text')).toHaveLength(1);
    });
  });

  describe('Props Validation', () => {
    it('should handle boolean true correctly', () => {
      render(<ConnectionStatus isConnected={true} />);
      
      expect(screen.getByText('Real-time updates: Connected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('connected');
    });

    it('should handle boolean false correctly', () => {
      render(<ConnectionStatus isConnected={false} />);
      
      expect(screen.getByText('Real-time updates: Disconnected')).toBeInTheDocument();
      expect(document.querySelector('.connection-indicator')).toHaveClass('disconnected');
    });
  });

  describe('Accessibility', () => {
    it('should have readable status text', () => {
      const { rerender } = render(<ConnectionStatus isConnected={true} />);
      
      expect(screen.getByText('Real-time updates: Connected')).toBeInTheDocument();
      
      rerender(<ConnectionStatus isConnected={false} />);
      
      expect(screen.getByText('Real-time updates: Disconnected')).toBeInTheDocument();
    });

    it('should provide visual indicators through CSS classes', () => {
      const { rerender } = render(<ConnectionStatus isConnected={true} />);
      
      let indicator = document.querySelector('.connection-indicator');
      expect(indicator).toHaveClass('connected');
      
      rerender(<ConnectionStatus isConnected={false} />);
      
      indicator = document.querySelector('.connection-indicator');
      expect(indicator).toHaveClass('disconnected');
    });
  });
});