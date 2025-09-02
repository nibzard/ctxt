import React, { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  tier: string;
  features: string[];
}

interface PricingCardProps {
  product: Product;
  isCurrentTier: boolean;
  onSelectPlan: (productId: string, tier: string) => void;
  loading: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  product, 
  isCurrentTier, 
  onSelectPlan, 
  loading 
}) => {
  const isPro = product.tier === 'pro';
  // const isPower = product.tier === 'power'; // Currently unused

  return (
    <div className={`relative rounded-lg border p-6 ${
      isPro 
        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500' 
        : 'border-gray-200 bg-white'
    }`}>
      {isPro && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
        <p className="text-sm text-gray-600 mt-2">{product.description}</p>
        
        <div className="mt-4">
          <span className="text-3xl font-bold text-gray-900">${product.price}</span>
          <span className="text-gray-600">/{product.interval}</span>
        </div>
        
        <button
          onClick={() => onSelectPlan(product.id, product.tier)}
          disabled={isCurrentTier || loading}
          className={`mt-6 w-full py-2 px-4 rounded-md font-medium ${
            isCurrentTier
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : isPro
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          } transition-colors duration-200`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="ml-2">Processing...</span>
            </div>
          ) : isCurrentTier ? (
            'Current Plan'
          ) : (
            'Upgrade Now'
          )}
        </button>
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Features included:</h4>
        <ul className="space-y-2">
          {product.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface PricingProps {
  currentTier?: string;
  onUpgrade?: (newTier: string) => void;
}

export const PricingSection: React.FC<PricingProps> = ({ 
  currentTier = 'free'
  // onUpgrade // Currently unused
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/payment/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError('Failed to load pricing plans');
      console.error('Error fetching products:', err);
    }
  };

  const handleSelectPlan = async (productId: string, tier: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create checkout session with new API format
      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          product_ids: [productId],  // Array of product IDs
          tier: tier
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      // Redirect to Polar checkout
      window.location.href = data.checkout_url;
      
    } catch (err) {
      setError('Failed to create checkout session. Please try again.');
      console.error('Error creating checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  const freeFeatures = [
    '5 conversions per day',
    'Copy to clipboard',
    'ChatGPT & Claude export',
    'Access to public SEO pages',
    'Basic share links'
  ];

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start free, upgrade when you need more power
          </p>
        </div>

        {error && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {/* Free Tier */}
          <div className="relative rounded-lg border border-gray-200 bg-white p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Free</h3>
              <p className="text-sm text-gray-600 mt-2">
                Perfect for getting started with ctxt.help
              </p>
              
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/forever</span>
              </div>
              
              <button
                disabled={currentTier === 'free'}
                className={`mt-6 w-full py-2 px-4 rounded-md font-medium ${
                  currentTier === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } transition-colors duration-200`}
              >
                {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
              </button>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Features included:</h4>
              <ul className="space-y-2">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Paid Plans */}
          {products.map((product) => (
            <PricingCard
              key={product.id}
              product={product}
              isCurrentTier={currentTier === product.tier}
              onSelectPlan={handleSelectPlan}
              loading={loading}
            />
          ))}
        </div>

        {/* Enterprise */}
        <div className="mt-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">Enterprise</h3>
            <p className="text-sm text-gray-600 mt-2">
              Custom solutions for teams and organizations
            </p>
            <div className="mt-4">
              <a
                href="mailto:enterprise@ctxt.help"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Contact Sales
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include secure payments via Polar.sh with global tax handling.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
};