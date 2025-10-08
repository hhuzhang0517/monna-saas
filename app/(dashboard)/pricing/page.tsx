import { checkoutAction } from '@/lib/payments/actions';
import { Check, Crown, Zap, Building, Gift } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  // 尝试获取 Stripe 数据，如果失败则使用默认配置
  let prices: any[] = [];
  let products: any[] = [];
  
  try {
    const [stripePrices, stripeProducts] = await Promise.all([
      getStripePrices(),
      getStripeProducts(),
    ]);
    prices = stripePrices;
    products = stripeProducts;
  } catch (error) {
    console.warn('Stripe not configured, using default pricing data');
  }

  // 查找新的产品计划，如果没有找到则使用默认值
  const basicPlan = products.find((product) => product.name === '基础档');
  const professionalPlan = products.find((product) => product.name === '专业档');
  const enterprisePlan = products.find((product) => product.name === '企业档');

  const basicPrice = prices.find((price) => price.productId === basicPlan?.id);
  const professionalPrice = prices.find((price) => price.productId === professionalPlan?.id);
  const enterprisePrice = prices.find((price) => price.productId === enterprisePlan?.id);

  // 检查是否有有效的产品配置
  const hasValidProducts = basicPlan && professionalPlan && enterprisePlan && basicPrice && professionalPrice && enterprisePrice;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">选择适合您的计划</h1>
        <p className="text-xl text-gray-600">基于信用点的AI图片和视频生成服务</p>
      </div>
      
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* 免费档 */}
        <PricingCard
          name="免费档"
          price={0}
          credits={20}
          interval="永久"
          icon={<Gift className="h-6 w-6" />}
          popular={false}
          features={[
            '20 信用点',
            '仅图片生成',
            '10 信用点/张图片',
            '基础支持',
          ]}
          priceId={null}
          isFree={true}
          isConfigured={true}
        />
        
        {/* 基础档 */}
        <PricingCard
          name="基础档"
          price={basicPrice?.unitAmount || 2000}
          credits={2000}
          interval={basicPrice?.interval || 'month'}
          icon={<Zap className="h-6 w-6" />}
          popular={false}
          features={[
            '2000 信用点/月',
            '仅图片生成',
            '10 信用点/张图片',
            '邮件支持',
          ]}
          priceId={basicPrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
        />
        
        {/* 专业档 */}
        <PricingCard
          name="专业档"
          price={professionalPrice?.unitAmount || 4000}
          credits={4000}
          interval={professionalPrice?.interval || 'month'}
          icon={<Crown className="h-6 w-6" />}
          popular={true}
          features={[
            '4000 信用点/月',
            '图片 + 视频生成',
            '8 信用点/张图片',
            '15 信用点/秒短视频',
            '80 信用点/秒长视频',
            '优先支持',
          ]}
          priceId={professionalPrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
        />
        
        {/* 企业档 */}
        <PricingCard
          name="企业档"
          price={enterprisePrice?.unitAmount || 10000}
          credits={10000}
          interval={enterprisePrice?.interval || 'month'}
          icon={<Building className="h-6 w-6" />}
          popular={false}
          features={[
            '10000 信用点/月',
            '全功能访问',
            '8 信用点/张图片',
            '15 信用点/秒短视频',
            '80 信用点/秒长视频',
            '专属客服',
            'API 访问',
          ]}
          priceId={enterprisePrice?.id}
          isFree={false}
          isConfigured={hasValidProducts}
        />
      </div>
      
      <div className="text-center mt-12">
        <p className="text-gray-600">
          所有付费计划都支持随时取消，信用点不会过期
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
}: {
  name: string;
  price: number;
  credits: number;
  interval: string;
  icon: React.ReactNode;
  popular: boolean;
  features: string[];
  priceId?: string | null;
  isFree: boolean;
  isConfigured?: boolean;
}) {
  return (
    <div className={`relative p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
      popular 
        ? 'border-orange-500 shadow-lg scale-105' 
        : 'border-gray-200 hover:border-orange-300'
    }`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            推荐
          </span>
        </div>
      )}
      
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
          popular ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {icon}
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        
        <div className="mb-4">
          {isFree ? (
            <div className="text-4xl font-bold text-gray-900">免费</div>
          ) : (
            <>
              <div className="text-4xl font-bold text-gray-900">
                ${price / 100}
                <span className="text-lg font-normal text-gray-600">
                  /{interval === 'month' ? '月' : interval}
                </span>
              </div>
              <div className="text-orange-600 font-medium mt-1">
                {credits.toLocaleString()} 信用点/月
              </div>
            </>
          )}
        </div>
      </div>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      {isFree ? (
        <button
          disabled
          className="w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
        >
          当前计划
        </button>
      ) : !isConfigured ? (
        <div className="w-full">
          <SubmitButton 
            text="配置中..." 
            disabled={true} 
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            支付系统正在配置中
          </p>
        </div>
      ) : !priceId ? (
        <div className="w-full">
          <SubmitButton 
            text="暂不可用" 
            disabled={true} 
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            请先配置 Stripe 价格
          </p>
        </div>
      ) : (
        <form action={checkoutAction} className="w-full">
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      )}
    </div>
  );
}
