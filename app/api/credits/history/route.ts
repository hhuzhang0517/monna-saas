import { NextRequest, NextResponse } from "next/server";
import { getUserTeamCreditHistory } from "@/lib/db/queries";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supa = await createSupabaseServer();
    const { data: { user }, error } = await supa.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 获取查询参数
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20; // 最多返回100条记录

    // 获取信用点交易历史
    const history = await getUserTeamCreditHistory(limit);
    
    return NextResponse.json({
      transactions: history.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balance_before: transaction.balance_before,
        balance_after: transaction.balance_after,
        reason: transaction.reason,
        created_at: transaction.created_at,
        user_id: transaction.user_id,
        job_info: transaction.job_info, // 包含任务详情
      })),
      count: history.length,
    });
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return NextResponse.json(
      { error: "failed to fetch credit history" }, 
      { status: 500 }
    );
  }
}

