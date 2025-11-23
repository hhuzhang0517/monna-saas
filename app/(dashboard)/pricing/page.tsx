'use client';

import { useEffect, useState } from 'react';
import { PricingClient } from './pricing-client';

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [pricingData, setPricingData] = useState<any>(null);

  useEffect(() => {
    // 客户端获取定价数据
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        setPricingData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch pricing data:', err);
        // 使用默认数据
        setPricingData({
          user: null,
          currentPlan: 'free',
          prices: [],
          products: [],
          hasValidProducts: false,
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!pricingData) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">
          加载失败，请刷新页面重试
        </div>
      </main>
    );
  }

  return (
    <PricingClient
      user={pricingData.user}
      currentPlan={pricingData.currentPlan}
      prices={pricingData.prices}
      products={pricingData.products}
      hasValidProducts={pricingData.hasValidProducts}
    />
  );
}
