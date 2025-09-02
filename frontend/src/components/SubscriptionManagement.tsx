import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface SubscriptionInfo {
  has_subscription: boolean;
  subscription_id?: string;
  tier: string;
  status?: string;
  subscription_ends_at?: string;
  cancel_at_period_end: boolean;
}

export const SubscriptionManagement: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/payment/subscription', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch subscription');
      
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError('Failed to load subscription information');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
      return;
    }

    setCanceling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/payment/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      const data = await response.json();
      setSuccess(data.message);
      
      // Refresh subscription data
      await fetchSubscription();
      
    } catch (err) {
      setError('Failed to cancel subscription. Please try again.');
      console.error('Error canceling subscription:', err);
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames = {
      'free': 'Free',
      'power': 'Power User',
      'pro': 'Pro',
      'enterprise': 'Enterprise'
    };
    return tierNames[tier as keyof typeof tierNames] || tier;
  };

  const getTierColor = (tier: string) => {
    const tierColors = {
      'free': 'bg-gray-100 text-gray-800',
      'power': 'bg-blue-100 text-blue-800',
      'pro': 'bg-purple-100 text-purple-800',
      'enterprise': 'bg-gold-100 text-gold-800'
    };
    return tierColors[tier as keyof typeof tierColors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Subscription Management
          </h3>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {subscription && (
            <div className="space-y-6">
              {/* Current Plan */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Plan</h4>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(subscription.tier)}`}>
                    {getTierDisplayName(subscription.tier)}
                  </span>
                  {subscription.has_subscription && subscription.status && (
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscription.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Subscription Details */}
              {subscription.has_subscription && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Subscription Details</h4>
                  <div className="bg-gray-50 rounded-md p-4 space-y-2">
                    {subscription.subscription_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subscription ID:</span>
                        <span className="text-gray-900 font-mono text-xs">
                          {subscription.subscription_id.slice(0, 8)}...
                        </span>
                      </div>
                    )}
                    
                    {subscription.subscription_ends_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {subscription.cancel_at_period_end ? 'Access ends:' : 'Next billing:'}
                        </span>
                        <span className="text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(subscription.subscription_ends_at)}
                        </span>
                      </div>
                    )}

                    {subscription.cancel_at_period_end && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Your subscription has been canceled and will not renew. You'll retain access to all features until the end of your current billing period.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Free Plan Details */}
              {!subscription.has_subscription && subscription.tier === 'free' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Details</h4>
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm text-gray-600">
                      You're currently on the free plan with 5 conversions per day. 
                      <a href="/pricing" className="text-blue-600 hover:text-blue-500 ml-1">
                        Upgrade to unlock unlimited conversions
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Manage Subscription</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Change your plan or cancel your subscription
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    {subscription.tier === 'free' ? (
                      <a
                        href="/pricing"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upgrade Plan
                      </a>
                    ) : (
                      <>
                        <a
                          href="/pricing"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Change Plan
                        </a>
                        
                        {subscription.has_subscription && !subscription.cancel_at_period_end && (
                          <button
                            onClick={handleCancelSubscription}
                            disabled={canceling}
                            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            {canceling ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                Canceling...
                              </>
                            ) : (
                              'Cancel Subscription'
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};