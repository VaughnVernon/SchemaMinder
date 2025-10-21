import { Product, Domain, Context } from '../types/schema';
import { AppEventHandlerDependencies } from './types';

export interface SubscriptionHandlers {
  handleSubscribeProduct: (product: Product) => Promise<void>;
  handleSubscribeDomain: (domain: Domain) => Promise<void>;
  handleSubscribeContext: (context: Context) => Promise<void>;
  handleUnsubscribeProduct: (product: Product) => Promise<void>;
  handleUnsubscribeDomain: (domain: Domain) => Promise<void>;
  handleUnsubscribeContext: (context: Context) => Promise<void>;
}

export const createSubscriptionHandlers = (deps: AppEventHandlerDependencies): SubscriptionHandlers => {
  const { showToastSuccess, showToastError, subscriptionState } = deps;

  const handleSubscribeProduct = async (product: Product): Promise<void> => {
    try {
      await subscriptionState.subscribe(product.id, 'P');
      showToastSuccess('Subscribed', `You will now receive notifications for "${product.name}"`);
    } catch (error) {
      console.error('Error subscribing to product:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Subscription Failed', `Failed to subscribe to "${product.name}": ${message}`);
    }
  };

  const handleSubscribeDomain = async (domain: Domain): Promise<void> => {
    try {
      await subscriptionState.subscribe(domain.id, 'D');
      showToastSuccess('Subscribed', `You will now receive notifications for "${domain.name}"`);
    } catch (error) {
      console.error('Error subscribing to domain:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Subscription Failed', `Failed to subscribe to "${domain.name}": ${message}`);
    }
  };

  const handleSubscribeContext = async (context: Context): Promise<void> => {
    try {
      await subscriptionState.subscribe(context.id, 'C');
      showToastSuccess('Subscribed', `You will now receive notifications for "${context.name}"`);
    } catch (error) {
      console.error('Error subscribing to context:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Subscription Failed', `Failed to subscribe to "${context.name}": ${message}`);
    }
  };

  const handleUnsubscribeProduct = async (product: Product): Promise<void> => {
    try {
      await subscriptionState.unsubscribe(product.id, 'P');
      showToastSuccess('Unsubscribed', `You will no longer receive notifications for "${product.name}"`);
    } catch (error) {
      console.error('Error unsubscribing from product:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Unsubscribe Failed', `Failed to unsubscribe from "${product.name}": ${message}`);
    }
  };

  const handleUnsubscribeDomain = async (domain: Domain): Promise<void> => {
    try {
      await subscriptionState.unsubscribe(domain.id, 'D');
      showToastSuccess('Unsubscribed', `You will no longer receive notifications for "${domain.name}"`);
    } catch (error) {
      console.error('Error unsubscribing from domain:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Unsubscribe Failed', `Failed to unsubscribe from "${domain.name}": ${message}`);
    }
  };

  const handleUnsubscribeContext = async (context: Context): Promise<void> => {
    try {
      await subscriptionState.unsubscribe(context.id, 'C');
      showToastSuccess('Unsubscribed', `You will no longer receive notifications for "${context.name}"`);
    } catch (error) {
      console.error('Error unsubscribing from context:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToastError('Unsubscribe Failed', `Failed to unsubscribe from "${context.name}": ${message}`);
    }
  };

  return {
    handleSubscribeProduct,
    handleSubscribeDomain,
    handleSubscribeContext,
    handleUnsubscribeProduct,
    handleUnsubscribeDomain,
    handleUnsubscribeContext
  };
};