import { NextResponse } from 'next/server';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getTeamForUser } from '@/lib/db/queries';

/**
 * GET /api/pricing
 * 获取定价页面所需的数据（用户信息、当前计划、Stripe产品和价格）
 * 用于客户端渲染优化，避免服务器端阻塞
 */
export async function GET() {
  try {
    // 获取当前用户
    const supabase = await createSupabaseServer();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    let currentPlan = 'free';
    let user = null;

    if (authUser) {
      // 获取用户完整信息
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      user = userData;

      // 获取团队信息
      const team = await getTeamForUser();
      if (team) {
        currentPlan = team.plan_name || team.planName || 'free';
      }
    }

    // 获取 Stripe 数据
    let prices: any[] = [];
    let products: any[] = [];
    let hasValidProducts = false;

    try {
      const [stripePrices, stripeProducts] = await Promise.all([
        getStripePrices().catch((err) => {
          console.error('Failed to fetch Stripe prices:', err);
          return [];
        }),
        getStripeProducts().catch((err) => {
          console.error('Failed to fetch Stripe products:', err);
          return [];
        }),
      ]);

      prices = stripePrices;
      products = stripeProducts;

      // 检查是否有有效的产品配置
      const basicPlan = products.find((product) => product.name === '基础档');
      const professionalPlan = products.find((product) => product.name === '专业档');
      const enterprisePlan = products.find((product) => product.name === '至尊档');

      const basicPrice = prices.find((price) => price.productId === basicPlan?.id);
      const professionalPrice = prices.find((price) => price.productId === professionalPlan?.id);
      const enterprisePrice = prices.find((price) => price.productId === enterprisePlan?.id);

      hasValidProducts = !!(basicPlan && professionalPlan && enterprisePlan && basicPrice && professionalPrice && enterprisePrice);
    } catch (error) {
      console.warn('Stripe not configured, using default pricing data', error);
    }

    return NextResponse.json({
      user,
      currentPlan,
      prices,
      products,
      hasValidProducts,
    });
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}
