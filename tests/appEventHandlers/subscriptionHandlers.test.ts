import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSubscriptionHandlers, SubscriptionHandlers } from '../../src/appEventHandlers/subscriptionHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';
import { Product, Domain, Context } from '../../src/types/schema';

describe('Subscription Handlers', () => {
  let mockDeps: Partial<AppEventHandlerDependencies>;
  let handlers: SubscriptionHandlers;

  // Mock data
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    description: 'A test product',
    domains: []
  };

  const mockDomain: Domain = {
    id: 'domain-1',
    name: 'Test Domain',
    description: 'A test domain',
    contexts: []
  };

  const mockContext: Context = {
    id: 'context-1',
    name: 'Test Context',
    description: 'A test context',
    schemas: []
  };

  beforeEach(() => {
    mockDeps = {
      showToastSuccess: vi.fn(),
      showToastError: vi.fn(),
      subscriptionState: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isSubscribed: vi.fn()
      }
    };

    handlers = createSubscriptionHandlers(mockDeps as AppEventHandlerDependencies);
  });

  describe('handleSubscribeProduct', () => {
    it('should successfully subscribe to product and show success toast', async () => {
      mockDeps.subscriptionState!.subscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleSubscribeProduct(mockProduct);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('product-1', 'P');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Subscribed',
        'You will now receive notifications for "Test Product"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle subscription error with Error object', async () => {
      const error = new Error('Network error');
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeProduct(mockProduct);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('product-1', 'P');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Product": Network error'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });

    it('should handle subscription error with non-Error object', async () => {
      const error = 'String error';
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeProduct(mockProduct);

      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Product": An unknown error occurred'
      );
    });

    it('should handle subscription error with null', async () => {
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(null);

      await handlers.handleSubscribeProduct(mockProduct);

      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Product": An unknown error occurred'
      );
    });
  });

  describe('handleSubscribeDomain', () => {
    it('should successfully subscribe to domain and show success toast', async () => {
      mockDeps.subscriptionState!.subscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleSubscribeDomain(mockDomain);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('domain-1', 'D');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Subscribed',
        'You will now receive notifications for "Test Domain"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle subscription error with Error object', async () => {
      const error = new Error('API error');
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeDomain(mockDomain);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('domain-1', 'D');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Domain": API error'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });

    it('should handle subscription error with unknown error type', async () => {
      const error = { message: 'Object error' };
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeDomain(mockDomain);

      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Domain": An unknown error occurred'
      );
    });
  });

  describe('handleSubscribeContext', () => {
    it('should successfully subscribe to context and show success toast', async () => {
      mockDeps.subscriptionState!.subscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleSubscribeContext(mockContext);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('context-1', 'C');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Subscribed',
        'You will now receive notifications for "Test Context"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle subscription error with Error object', async () => {
      const error = new Error('Permission denied');
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeContext(mockContext);

      expect(mockDeps.subscriptionState!.subscribe).toHaveBeenCalledWith('context-1', 'C');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Subscription Failed',
        'Failed to subscribe to "Test Context": Permission denied'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeProduct', () => {
    it('should successfully unsubscribe from product and show success toast', async () => {
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleUnsubscribeProduct(mockProduct);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('product-1', 'P');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Unsubscribed',
        'You will no longer receive notifications for "Test Product"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle unsubscription error with Error object', async () => {
      const error = new Error('Database error');
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleUnsubscribeProduct(mockProduct);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('product-1', 'P');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Unsubscribe Failed',
        'Failed to unsubscribe from "Test Product": Database error'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });

    it('should handle unsubscription error with non-Error object', async () => {
      const error = undefined;
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleUnsubscribeProduct(mockProduct);

      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Unsubscribe Failed',
        'Failed to unsubscribe from "Test Product": An unknown error occurred'
      );
    });
  });

  describe('handleUnsubscribeDomain', () => {
    it('should successfully unsubscribe from domain and show success toast', async () => {
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleUnsubscribeDomain(mockDomain);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('domain-1', 'D');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Unsubscribed',
        'You will no longer receive notifications for "Test Domain"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle unsubscription error with Error object', async () => {
      const error = new Error('Timeout error');
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleUnsubscribeDomain(mockDomain);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('domain-1', 'D');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Unsubscribe Failed',
        'Failed to unsubscribe from "Test Domain": Timeout error'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribeContext', () => {
    it('should successfully unsubscribe from context and show success toast', async () => {
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleUnsubscribeContext(mockContext);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('context-1', 'C');
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Unsubscribed',
        'You will no longer receive notifications for "Test Context"'
      );
      expect(mockDeps.showToastError).not.toHaveBeenCalled();
    });

    it('should handle unsubscription error with Error object', async () => {
      const error = new Error('Server unavailable');
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleUnsubscribeContext(mockContext);

      expect(mockDeps.subscriptionState!.unsubscribe).toHaveBeenCalledWith('context-1', 'C');
      expect(mockDeps.showToastError).toHaveBeenCalledWith(
        'Unsubscribe Failed',
        'Failed to unsubscribe from "Test Context": Server unavailable'
      );
      expect(mockDeps.showToastSuccess).not.toHaveBeenCalled();
    });
  });

  describe('error logging', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should log errors when subscription fails', async () => {
      const error = new Error('Test error');
      mockDeps.subscriptionState!.subscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleSubscribeProduct(mockProduct);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error subscribing to product:', error);
    });

    it('should log errors when unsubscription fails', async () => {
      const error = new Error('Test error');
      mockDeps.subscriptionState!.unsubscribe = vi.fn().mockRejectedValue(error);

      await handlers.handleUnsubscribeProduct(mockProduct);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error unsubscribing from product:', error);
    });
  });

  describe('handler creation', () => {
    it('should return all required handler functions', () => {
      expect(handlers).toHaveProperty('handleSubscribeProduct');
      expect(handlers).toHaveProperty('handleSubscribeDomain');
      expect(handlers).toHaveProperty('handleSubscribeContext');
      expect(handlers).toHaveProperty('handleUnsubscribeProduct');
      expect(handlers).toHaveProperty('handleUnsubscribeDomain');
      expect(handlers).toHaveProperty('handleUnsubscribeContext');

      expect(typeof handlers.handleSubscribeProduct).toBe('function');
      expect(typeof handlers.handleSubscribeDomain).toBe('function');
      expect(typeof handlers.handleSubscribeContext).toBe('function');
      expect(typeof handlers.handleUnsubscribeProduct).toBe('function');
      expect(typeof handlers.handleUnsubscribeDomain).toBe('function');
      expect(typeof handlers.handleUnsubscribeContext).toBe('function');
    });

    it('should handle entities with special characters in names', async () => {
      const specialProduct: Product = {
        id: 'product-special',
        name: 'Product with "quotes" & special chars',
        description: 'Special product',
        domains: []
      };

      mockDeps.subscriptionState!.subscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleSubscribeProduct(specialProduct);

      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Subscribed',
        'You will now receive notifications for "Product with "quotes" & special chars"'
      );
    });

    it('should handle entities with empty names', async () => {
      const emptyNameProduct: Product = {
        id: 'product-empty',
        name: '',
        description: 'Empty name product',
        domains: []
      };

      mockDeps.subscriptionState!.subscribe = vi.fn().mockResolvedValue(undefined);

      await handlers.handleSubscribeProduct(emptyNameProduct);

      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith(
        'Subscribed',
        'You will now receive notifications for ""'
      );
    });
  });
});