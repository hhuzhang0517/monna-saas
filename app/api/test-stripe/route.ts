import { NextResponse } from 'next/server';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';

export async function GET() {
  try {
    console.log('Testing Stripe configuration...');

    const [prices, products] = await Promise.all([
      getStripePrices(),
      getStripeProducts()
    ]);

    console.log('Stripe products:', products);
    console.log('Stripe prices:', prices);

    const basicPlan = products.find((product) => product.name === '基础档');
    const professionalPlan = products.find((product) => product.name === '专业档');
    const enterprisePlan = products.find((product) => product.name === '企业档');

    const basicPrice = prices.find((price) => price.productId === basicPlan?.id);
    const professionalPrice = prices.find((price) => price.productId === professionalPlan?.id);
    const enterprisePrice = prices.find((price) => price.productId === enterprisePlan?.id);

    return NextResponse.json({
      success: true,
      products: {
        basic: basicPlan,
        professional: professionalPlan,
        enterprise: enterprisePlan
      },
      prices: {
        basic: basicPrice,
        professional: professionalPrice,
        enterprise: enterprisePrice
      },
      hasValidConfiguration: !!(basicPlan && professionalPlan && enterprisePlan && basicPrice && professionalPrice && enterprisePrice),
      allProducts: products,
      allPrices: prices
    });
  } catch (error) {
    console.error('Stripe test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
