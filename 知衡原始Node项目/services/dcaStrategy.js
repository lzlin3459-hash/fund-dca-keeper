/**
 * 基金持仓追踪与“巴菲特价值投资 + 动态 PE 分位 + 月末净值折价”智能定投策略算法引擎
 * 
 * 🏛️ 巴菲特三大核心定理蒸馏：
 * 1. 安全边际定理 (Margin of Safety): 历史PE分位越低，安全边际越大，加码倍数越高
 * 2. 别人恐惧我贪婪 (Be Fearful When Others Are Greedy, Greedy When Others Are Fearful): 月末净值回调大跌时逆势低吸
 * 3. 护城河与长线复利 (Economic Moats & Long-term Compounding): 聚焦核心宽基与高壁垒硬科技龙头
 */
function analyzeFundPortfolio(trackedFunds = [], indices = [], plannedMonthlyTotalDca = 500) {
  if (!trackedFunds || trackedFunds.length === 0) {
    return {
      summary: {
        totalCost: 0,
        totalMarketValue: 0,
        totalProfit: 0,
        profitRate: '0.00%',
        recommendedMonthlyTotalDca: 0,
        baseMonthlyTotalDca: 0
      },
      funds: [],
      rebalancingAdvice: []
    };
  }

  // 1. 估值与月末净值表现映射
  const indexMap = {};
  indices.forEach(idx => {
    indexMap[idx.code] = idx;
  });

  let totalCost = 0;
  let totalMarketValue = 0;
  let baseMonthlyTotalDca = 0;
  let totalWeightedScore = 0;

  const rawFunds = trackedFunds.map(fund => {
    const cost = fund.units * fund.avgCost;
    const marketValue = fund.units * fund.currentNav;
    const profit = marketValue - cost;
    const profitRate = cost > 0 ? (profit / cost) * 100 : 0;

    totalCost += cost;
    totalMarketValue += marketValue;

    // 匹配关联板块指数估值与月末净值表现
    const matchedIndex = indexMap[fund.benchmarkIndex] || {
      pePercentile: 50,
      monthlyChange: 0,
      lastDayNavStatus: '月末平稳',
      name: fund.benchmarkIndex
    };

    const pePercentile = matchedIndex.pePercentile || 50;
    const monthlyChange = matchedIndex.monthlyChange || 0;
    const lastDayNavStatus = matchedIndex.lastDayNavStatus || '月末企稳';

    // 🏛️ 巴菲特法则一：安全边际乘数 (Margin of Safety Multiplier)
    let peMultiplier = 1.0;
    let strategyAction = '按计划标准定投 (1.0x)';
    let actionBadgeClass = 'badge-info';

    if (pePercentile < 30) {
      peMultiplier = 1.5; // 深度安全边际：低估黄金区
      strategyAction = '低估加码定投 (1.5x)';
      actionBadgeClass = 'badge-success';
    } else if (pePercentile >= 30 && pePercentile < 70) {
      peMultiplier = 1.0; // 合理估值：常态定投
      strategyAction = '按计划标准定投 (1.0x)';
      actionBadgeClass = 'badge-info';
    } else if (pePercentile >= 70 && pePercentile < 90) {
      peMultiplier = 0.5; // 边际收窄：减半防御
      strategyAction = '高估减半定投 (0.5x)';
      actionBadgeClass = 'badge-gold';
    } else if (pePercentile >= 90) {
      peMultiplier = 0.0; // 无安全边际：暂停风控
      strategyAction = '风险暂停定投 (0.0x)';
      actionBadgeClass = 'badge-warning';
    }

    // 🏛️ 巴菲特法则二：别人恐惧我贪婪逆向乘数 (Contrarian Greed Multiplier)
    let navMultiplier = 1.0;
    if (monthlyChange <= -3.0) {
      navMultiplier = 1.15; // 大众恐惧抛售，当月大跌，逆势加码吸筹
    } else if (monthlyChange < 0 && monthlyChange > -3.0) {
      navMultiplier = 1.08; // 温和回调，回踩买入
    } else if (monthlyChange >= 0 && monthlyChange < 4.0) {
      navMultiplier = 1.00; // 平稳震荡
    } else if (monthlyChange >= 4.0) {
      navMultiplier = 0.90; // 当月大涨，市场贪婪，适当收敛
    }

    const baseDca = fund.baseMonthlyDca || 100;
    baseMonthlyTotalDca += baseDca;

    // 综合巴菲特量化得分 = 基础额 * 安全边际乘数 * 逆向贪婪乘数
    const combinedScore = baseDca * peMultiplier * navMultiplier;
    totalWeightedScore += combinedScore;

    return {
      ...fund,
      cost: Math.round(cost),
      marketValue: Math.round(marketValue),
      profit: Math.round(profit),
      profitRate: profitRate.toFixed(2) + '%',
      matchedIndexName: matchedIndex.name || fund.benchmarkIndex,
      pePercentile,
      monthlyChange,
      lastDayNavStatus,
      peMultiplier,
      navMultiplier,
      combinedScore,
      strategyAction,
      actionBadgeClass
    };
  });

  // 精准分配当月定投总预算
  const effectiveTotalDca = plannedMonthlyTotalDca || 500;
  let allocatedSum = 0;

  const processedFunds = rawFunds.map((fund, idx) => {
    let plannedDcaAmount = 0;
    if (totalWeightedScore > 0) {
      plannedDcaAmount = Math.round((fund.combinedScore / totalWeightedScore) * effectiveTotalDca);
    }
    allocatedSum += plannedDcaAmount;

    return {
      ...fund,
      plannedDcaAmount
    };
  });

  const totalProfit = totalMarketValue - totalCost;
  const overallProfitRate = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(2) + '%' : '0.00%';

  const rebalancingAdvice = [];
  processedFunds.forEach(fund => {
    const actualShare = totalMarketValue > 0 ? (fund.marketValue / totalMarketValue) : 0;
    const targetShare = fund.targetShare || 0;
    const deviation = (actualShare - targetShare) * 100;

    fund.actualSharePct = (actualShare * 100).toFixed(1) + '%';
    fund.targetSharePct = (targetShare * 100).toFixed(1) + '%';
    fund.deviation = (deviation >= 0 ? '+' : '') + deviation.toFixed(1) + '%';

    if (deviation >= 5.0) {
      rebalancingAdvice.push(`⚠️ 【止盈机械再平衡】${fund.name} 当前持仓占比 (${fund.actualSharePct}) 偏离目标 (${fund.targetSharePct}) 超过 +5.0%，建议止盈超出部分，资金归拢回底仓宽基或纯债。`);
    } else if (deviation <= -5.0) {
      rebalancingAdvice.push(`🟢 【低补机械再平衡】${fund.name} 当前持仓占比 (${fund.actualSharePct}) 偏离目标 (${fund.targetSharePct}) 低于 -5.0%，具备极佳低位补仓性价比。`);
    }
  });

  return {
    summary: {
      totalCost: Math.round(totalCost),
      totalMarketValue: Math.round(totalMarketValue),
      totalProfit: Math.round(totalProfit),
      profitRate: overallProfitRate,
      baseMonthlyTotalDca,
      recommendedMonthlyTotalDca: allocatedSum
    },
    funds: processedFunds,
    rebalancingAdvice
  };
}

module.exports = {
  analyzeFundPortfolio
};
