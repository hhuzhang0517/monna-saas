'use client';

import { checkoutAction } from '@/lib/payments/actions';
import { SubmitButton } from './submit-button';
import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/lib/contexts/language-context';

type CheckoutFormProps = {
  priceId: string;
};

export function CheckoutForm({ priceId }: CheckoutFormProps) {
  const { t } = useTranslation();
  const [paymentType, setPaymentType] = useState<'subscription' | 'onetime'>('subscription');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // 当显示/隐藏选项时，重置支付类型到默认值
  useEffect(() => {
    if (showPaymentOptions) {
      setPaymentType('subscription');
    }
  }, [showPaymentOptions]);

  return (
    <div className="w-full space-y-3">
      {!showPaymentOptions ? (
        <button
          onClick={() => setShowPaymentOptions(true)}
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {t('getStarted')}
        </button>
      ) : (
        <div className="space-y-3">
          {/* 信用卡订阅选项 */}
          <label
            className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              paymentType === 'subscription'
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`paymentType-${priceId}`}
              value="subscription"
              checked={paymentType === 'subscription'}
              onChange={(e) => setPaymentType(e.target.value as 'subscription')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <CreditCard className="h-5 w-5" />
                <span>{t('creditCardSubscription')}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t('creditCardSubscriptionDesc')}
              </p>
            </div>
          </label>

          {/* 支付宝一次性支付选项 */}
          <label
            className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              paymentType === 'onetime'
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`paymentType-${priceId}`}
              value="onetime"
              checked={paymentType === 'onetime'}
              onChange={(e) => setPaymentType(e.target.value as 'onetime')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <Image
                  src="/figma-designs/AliPay.png"
                  alt={t('alipayPayment')}
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <span>{t('alipayPayment')}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t('alipayPaymentDesc')}
              </p>
            </div>
          </label>

          {/* 提交按钮 */}
          <form action={checkoutAction}>
            <input type="hidden" name="priceId" value={priceId} />
            <input type="hidden" name="paymentType" value={paymentType} />
            <SubmitButton />
          </form>
        </div>
      )}
    </div>
  );
}
