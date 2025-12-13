'use client';

import { Check, Crown, Zap, Building, Gift, CheckCircle, X } from 'lucide-react';
import { CheckoutForm } from './checkout-form';
import { useTranslation } from '@/lib/contexts/language-context';
import { purchaseCreditsPackAction } from '@/lib/payments/actions';
import { SubmitButton } from './submit-button';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface PricingClientProps {
  user: any;
  currentPlan: string;
  prices: any[];
  products: any[];
  hasValidProducts: boolean;
}

export function PricingClient({
  user,
  currentPlan,
  prices,
  products,
  hasValidProducts,
}: PricingClientProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // 检查是否有成功消息
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'credits_purchased') {
      setShowSuccessMessage(true);
      // 3秒后自动隐藏
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // 查找产品计划
  const basicPlan = products.find((product) => product.name === '基础档');
  const professionalPlan = products.find((product) => product.name === '专业档');
  const enterprisePlan = products.find((product) => product.name === '至尊档');

  const basicPrice = prices.find((price) => price.productId === basicPlan?.id);
  const professionalPrice = prices.find((price) => price.productId === professionalPlan?.id);
  const enterprisePrice = prices.find((price) => price.productId === enterprisePlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 成功消息提示 */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-900 mb-1">
                  {t('purchaseSuccess') || '购买成功！'}
                </h3>
                <p className="text-sm text-green-700">
                  {t('creditsAddedMessage') || '您的信用点即将到账，请稍候片刻刷新页面查看。'}
                </p>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-3 text-green-600 hover:text-green-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('choosePlan')}</h1>
        <p className="text-xl text-gray-600">{t('choosePlanSubtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* 免费档 */}
        <PricingCard
          name={t('freePlan')}
          price={0}
          credits={20}
          interval={t('forever')}
          icon={<Gift className="h-6 w-6" />}
          popular={false}
          features={[
            t('creditsPerMonth', { credits: '20' }),
            t('imageOnly'),
            t('creditsPerImage', { credits: '10' }),
            t('basicSupport'),
          ]}
          priceId={null}
          isFree={true}
          isConfigured={true}
          planKey="free"
          currentPlan={currentPlan}
        />

        {/* 基础档 */}
        <PricingCard
          name={t('basicPlan')}
          price={basicPrice?.unitAmount || 2000}
          credits={2000}
          interval={basicPrice?.interval || 'month'}
          icon={<Zap className="h-6 w-6" />}
          popular={false}
          features={[
            t('creditsPerMonth', { credits: '2000' }),
            t('imageOnly'),
            t('creditsPerImage', { credits: '10' }),
            t('emailSupport'),
          ]}
          priceId={basicPrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
          planKey="basic"
          currentPlan={currentPlan}
        />

        {/* 专业档 */}
        <PricingCard
          name={t('professionalPlan')}
          price={professionalPrice?.unitAmount || 4000}
          credits={4000}
          interval={professionalPrice?.interval || 'month'}
          icon={<Crown className="h-6 w-6" />}
          popular={true}
          features={[
            t('creditsPerMonth', { credits: '4000' }),
            t('imageAndShortVideo'),
            t('creditsPerImage', { credits: '8' }),
            t('creditsPerSecondShortVideo', { credits: '15' }),
            t('prioritySupport'),
          ]}
          priceId={professionalPrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
          planKey="professional"
          currentPlan={currentPlan}
        />

        {/* 至尊档 */}
        <PricingCard
          name={t('enterprisePlan')}
          price={enterprisePrice?.unitAmount || 10000}
          credits={12000}
          interval={enterprisePrice?.interval || 'month'}
          icon={<Building className="h-6 w-6" />}
          popular={false}
          features={[
            t('creditsPerMonth', { credits: '12000' }),
            t('fullFeatureAccess'),
            t('creditsPerImage', { credits: '8' }),
            t('creditsPerSecondShortVideo', { credits: '15' }),
            t('creditsPerSecondLongVideo', { credits: '80' }),
            t('dedicatedSupport'),
            t('apiAccess'),
          ]}
          priceId={enterprisePrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
          planKey="enterprise"
          currentPlan={currentPlan}
        />
      </div>

      {/* 流量包部分 */}
      <div className="mt-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('creditsPack')}</h2>
          <p className="text-lg text-gray-600">{t('creditsPackSubtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* $5 流量包 - 免费用户可购买 */}
          <CreditsPackCard
            credits={500}
            price={5}
            priceId="price_1SP0VvA8Ld2Pk5ecXgf6d4M2"
            availableForFree={true}
            currentPlan={currentPlan}
          />

          {/* $20 流量包 */}
          <CreditsPackCard
            credits={2000}
            price={20}
            priceId="price_1SP0WLA8Ld2Pk5ecFibvEEo2"
            availableForFree={false}
            currentPlan={currentPlan}
          />

          {/* $50 流量包 */}
          <CreditsPackCard
            credits={5000}
            price={50}
            priceId="price_1SP0WkA8Ld2Pk5ecrXtBd30h"
            availableForFree={false}
            currentPlan={currentPlan}
          />

          {/* $100 流量包 */}
          <CreditsPackCard
            credits={10000}
            price={100}
            priceId="price_1SP0X6A8Ld2Pk5ecVjiUYNfC"
            availableForFree={false}
            currentPlan={currentPlan}
          />
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-gray-600">
          {t('allPlansNote')}
        </p>
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  credits,
  interval,
  icon,
  popular,
  features,
  priceId,
  isFree,
  isConfigured = true,
  planKey,
  currentPlan,
}: {
  name: string;
  price: number;
  credits: number;
  interval: string;
  icon: React.ReactNode;
  popular: boolean;
  features: string[];
  priceId: string | null;
  isFree: boolean;
  isConfigured?: boolean;
  planKey: string;
  currentPlan: string;
}) {
  const { t } = useTranslation();
  const isCurrentPlan = currentPlan === planKey;

  return (
    <div className={`relative bg-white rounded-2xl shadow-xl p-8 ${popular ? 'ring-2 ring-orange-600' : ''}`}>
      {popular && (
        <span className="absolute top-0 right-0 -translate-y-1/2 bg-orange-600 text-white px-4 py-1 rounded-full text-sm font-medium">
          {t('mostPopular')}
        </span>
      )}

      <div className="flex items-center mb-4">
        <div className="mr-3 text-orange-600">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-extrabold text-gray-900">
            ${isFree ? '0' : (price / 100).toFixed(0)}
          </span>
          {!isFree && (
            <span className="ml-2 text-gray-600">
              /{interval === 'month' ? t('monthly') : t('yearly')}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {credits} {t('credits')}
        </p>
      </div>

      <ul className="mb-8 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <div>
        {isCurrentPlan ? (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
          >
            {t('currentPlan')}
          </button>
        ) : isFree ? (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
          >
            {t('freePlan')}
          </button>
        ) : isConfigured && priceId ? (
          <CheckoutForm priceId={priceId} />
        ) : (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-semibold cursor-not-allowed"
          >
            配置中...
          </button>
        )}
      </div>
    </div>
  );
}

function CreditsPackCard({
  credits,
  price,
  priceId,
  availableForFree,
  currentPlan,
}: {
  credits: number;
  price: number;
  priceId: string;
  availableForFree: boolean;
  currentPlan: string;
}) {
  const { t } = useTranslation();
  const canPurchase = availableForFree || currentPlan !== 'free';

  return (
    <div className="relative bg-gray-100 rounded-3xl shadow-xl p-8 border border-gray-200">
      <div className="text-center mb-6">
        <div className="text-4xl font-bold mb-3 flex items-center justify-center text-gray-900">
          <span className="mr-2">⚡</span>
          <span>{credits.toLocaleString()}</span>
        </div>
        <div className="text-3xl font-extrabold text-gray-600">
          ${price}
        </div>
      </div>

      {availableForFree && (
        <div className="text-center mb-4">
          <span className="inline-block bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
            {t('availableForFreeUsers')}
          </span>
        </div>
      )}

      {!availableForFree && (
        <div className="text-center mb-4">
          <span className="inline-block bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
            {t('forSubscribersOnly')}
          </span>
        </div>
      )}

      {canPurchase ? (
        <form action={purchaseCreditsPackAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton text={t('purchase')} />
        </form>
      ) : (
        <button
          disabled
          className="w-full py-3 rounded-full font-semibold transition-all duration-200 shadow-sm bg-gray-700 text-gray-500 cursor-not-allowed"
        >
          {t('purchase')}
        </button>
      )}
    </div>
  );
}
