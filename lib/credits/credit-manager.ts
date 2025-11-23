// Supabase 版本的信用点管理器 - 单一数据库架构
import { createSupabaseServer } from '@/lib/supabase/server';
import { getTeamCredits } from '@/lib/db/queries';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreditOperation {
  teamId: number;
  userId?: string;
  jobId?: string;
  amount: number;
  type: 'charge' | 'consume' | 'refund' | 'bonus';
  reason: string;
  metadata?: Record<string, any>;
  supabaseClient?: SupabaseClient<any, "public", any>; // 可选：外部传入的 Supabase 客户端
}

export interface CreditBalance {
  credits: number;
  total_credits: number;
  credits_consumed: number;
  last_credit_update: string;
}

// 订阅计划配置
export const SUBSCRIPTION_PLANS = {
  free: {
    name: '免费档',
    price: 0,
    credits: 20,
    features: {
      imageGeneration: true,
      videoGeneration: false,
      longVideoGeneration: false,
    },
    creditCosts: {
      image: 10,
    }
  },
  basic: {
    name: '基础档',
    price: 2000, // $20.00 in cents
    credits: 2000,
    features: {
      imageGeneration: true,
      videoGeneration: false,
      longVideoGeneration: false,
    },
    creditCosts: {
      image: 10,
    }
  },
  professional: {
    name: '专业档',
    price: 4000, // $40.00 in cents
    credits: 4000,
    features: {
      imageGeneration: true,
      videoGeneration: true,
      longVideoGeneration: false, // 专业档不支持长视频生成
    },
    creditCosts: {
      image: 8,
      videoPerSecond: 15, // 短视频每秒15 credit
    }
  },
  enterprise: {
    name: '至尊档',
    price: 10000, // $100.00 in cents
    credits: 10000,
    features: {
      imageGeneration: true,
      videoGeneration: true,
      longVideoGeneration: true,
    },
    creditCosts: {
      image: 8,
      videoPerSecond: 15,
      longVideoPerSecond: 80,
    }
  }
} as const;

export class CreditManager {
  /**
   * 获取团队的信用点余额信息
   */
  static async getTeamCredits(teamId: number): Promise<CreditBalance | null> {
    return await getTeamCredits(teamId);
  }

  /**
   * 检查团队是否有足够的信用点
   */
  static async hasEnoughCredits(teamId: number, requiredCredits: number): Promise<boolean> {
    const balance = await this.getTeamCredits(teamId);
    return balance ? balance.credits >= requiredCredits : false;
  }

  /**
   * 执行信用点交易（原子操作）
   */
  static async executeTransaction(operation: CreditOperation): Promise<boolean> {
    // 使用外部传入的客户端，或创建新的（用于 webhook 等场景）
    const supabase = operation.supabaseClient || await createSupabaseServer();
    
    try {
      // 获取当前余额
      const { data: currentTeam, error: teamError } = await supabase
        .from('teams')
        .select('credits, total_credits, credits_consumed')
        .eq('id', operation.teamId)
        .single();

      if (teamError || !currentTeam) {
        throw new Error(`Team ${operation.teamId} not found`);
      }

      const balanceBefore = currentTeam.credits;
      let newCredits: number;
      let newTotalCredits = currentTeam.total_credits;
      let newCreditsConsumed = currentTeam.credits_consumed;
      let transactionAmount: number;

      switch (operation.type) {
        case 'charge':
        case 'bonus':
        case 'refund':
          // 充值/奖励/退款：增加余额
          newCredits = balanceBefore + Math.abs(operation.amount);
          transactionAmount = Math.abs(operation.amount);
          if (operation.type === 'charge' || operation.type === 'bonus') {
            newTotalCredits += Math.abs(operation.amount);
          }
          break;
        
        case 'consume':
          // 消耗：减少余额
          const consumeAmount = Math.abs(operation.amount);
          if (balanceBefore < consumeAmount) {
            throw new Error(`Insufficient credits. Required: ${consumeAmount}, Available: ${balanceBefore}`);
          }
          newCredits = balanceBefore - consumeAmount;
          newCreditsConsumed += consumeAmount;
          transactionAmount = -consumeAmount;
          break;
        
        default:
          throw new Error(`Invalid transaction type: ${operation.type}`);
      }

      const balanceAfter = newCredits;

      // 使用 Supabase 事务处理
      const { error: updateError } = await supabase.rpc('execute_credit_transaction_safe', {
        p_team_id: operation.teamId,
        p_user_id: operation.userId || null,
        p_job_id: operation.jobId || null,
        p_type: operation.type,
        p_amount: transactionAmount,
        p_reason: operation.reason,
        p_metadata: operation.metadata || null,
        p_expected_balance: balanceBefore
      });

      if (updateError) {
        // 如果 RPC 函数不存在，使用基本的更新方式
        console.warn('RPC function not available, using basic update:', updateError);
        
        // 更新团队信用点
        const { error: teamUpdateError } = await supabase
          .from('teams')
          .update({
            credits: newCredits,
            total_credits: newTotalCredits,
            credits_consumed: newCreditsConsumed,
            last_credit_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', operation.teamId);

        if (teamUpdateError) {
          throw teamUpdateError;
        }

        // 记录交易 - 暂时不关联 job_id 避免外键约束问题
        const transactionData = {
          team_id: operation.teamId,
          user_id: operation.userId || null,
          job_id: null, // 暂时设为null，避免外键约束问题
          type: operation.type,
          amount: transactionAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reason: operation.reason,
          metadata: operation.metadata ? 
            { ...operation.metadata, original_job_id: operation.jobId } : 
            { original_job_id: operation.jobId }
        };

        console.log('💳 Recording credit transaction:', {
          type: transactionData.type,
          amount: transactionData.amount,
          team_id: transactionData.team_id,
          reason: transactionData.reason.substring(0, 30) + '...'
        });

        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert(transactionData);

        if (transactionError) {
          console.error('❌ Credit transaction failed:', transactionError);
          throw transactionError;
        } else {
          console.log('✅ Credit transaction recorded');
        }
      }

      return true;
    } catch (error) {
      console.error('Credit transaction failed:', error);
      return false;
    }
  }

  /**
   * 充值信用点（订阅时调用）
   */
  static async chargeCredits(params: {
    teamId: number;
    userId?: string;
    amount: number;
    reason: string;
    planName?: string;
    supabaseClient?: SupabaseClient<any, "public", any>; // 可选：外部传入的客户端
  }): Promise<boolean> {
    return this.executeTransaction({
      teamId: params.teamId,
      userId: params.userId,
      amount: params.amount,
      type: 'charge',
      reason: params.reason,
      metadata: { planName: params.planName },
      supabaseClient: params.supabaseClient, // 传递客户端
    });
  }

  /**
   * 消耗信用点（生成任务时调用）
   */
  static async consumeCredits(params: {
    teamId: number;
    userId?: string;
    jobId: string;
    amount: number;
    taskType: 'image' | 'video' | 'longvideo';
    planName?: string;
  }): Promise<boolean> {
    return this.executeTransaction({
      teamId: params.teamId,
      userId: params.userId,
      jobId: params.jobId,
      amount: params.amount,
      type: 'consume',
      reason: `生成${params.taskType === 'image' ? '图片' : params.taskType === 'video' ? '视频' : '长视频'}任务`,
      metadata: { taskType: params.taskType, planName: params.planName },
    });
  }

  /**
   * 退还信用点（任务失败时调用）
   */
  static async refundCredits(params: {
    teamId: number;
    userId?: string;
    jobId: string;
    amount: number;
    reason: string;
  }): Promise<boolean> {
    return this.executeTransaction({
      teamId: params.teamId,
      userId: params.userId,
      jobId: params.jobId,
      amount: params.amount,
      type: 'refund',
      reason: params.reason,
    });
  }

  /**
   * 获取团队的信用点交易历史
   */
  static async getTransactionHistory(teamId: number, limit: number = 50) {
    const supabase = await createSupabaseServer();
    
    const { data, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        profiles (
          name
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Failed to fetch credit history:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * 根据任务类型和订阅计划计算所需信用点
   */
  static calculateRequiredCredits(params: {
    taskType: 'image' | 'video' | 'longvideo';
    planName: string;
    duration?: number; // 视频时长（秒）
  }): number {
    const plan = SUBSCRIPTION_PLANS[params.planName as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      // 默认使用免费计划的费用
      return SUBSCRIPTION_PLANS.free.creditCosts.image;
    }

    switch (params.taskType) {
      case 'image':
        return plan.creditCosts.image;

      case 'video':
        if (!('videoPerSecond' in plan.creditCosts)) {
          throw new Error(`Plan ${params.planName} does not support video generation`);
        }
        return Math.ceil((params.duration || 5) * plan.creditCosts.videoPerSecond);

      case 'longvideo':
        if (!('longVideoPerSecond' in plan.creditCosts)) {
          throw new Error(`Plan ${params.planName} does not support long video generation`);
        }
        return Math.ceil((params.duration || 30) * plan.creditCosts.longVideoPerSecond);
      
      default:
        throw new Error(`Invalid task type: ${params.taskType}`);
    }
  }

  /**
   * 检查订阅计划是否支持指定功能
   */
  static isPlanFeatureEnabled(planName: string, feature: 'imageGeneration' | 'videoGeneration' | 'longVideoGeneration'): boolean {
    const plan = SUBSCRIPTION_PLANS[planName as keyof typeof SUBSCRIPTION_PLANS];
    return plan ? plan.features[feature] : false;
  }

  /**
   * 为新订阅分配初始信用点
   */
  static async allocateSubscriptionCredits(params: {
    teamId: number;
    userId?: string;
    planName: string;
    supabaseClient?: SupabaseClient<any, "public", any>; // 可选：外部传入的客户端
  }): Promise<boolean> {
    const plan = SUBSCRIPTION_PLANS[params.planName as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      console.error(`Invalid plan name: ${params.planName}`);
      return false;
    }

    return this.chargeCredits({
      teamId: params.teamId,
      userId: params.userId,
      amount: plan.credits,
      reason: `订阅${plan.name}计划获得信用点`,
      planName: params.planName,
      supabaseClient: params.supabaseClient, // 传递客户端
    });
  }
}

export default CreditManager;