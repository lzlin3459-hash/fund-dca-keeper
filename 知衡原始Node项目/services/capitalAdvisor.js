/**
 * 资金存储、负债结构与收入全盘体检及最优资金处理方案引擎
 */
function analyzeCapitalAndDebt(profile = {}, financials = {}) {
  const {
    monthlyFixedExpense = 6000,
    expectedAnnualReturn = 0.10
  } = profile;

  const {
    incomeStreams = [],
    savingsStorage = { liquidCash: 0, fixedDeposits: 0, idleFunds: 0 },
    debts = []
  } = financials;

  // 1. 收入结构分析
  let totalMonthlyIncome = 0;
  let stableIncome = 0;

  incomeStreams.forEach(inc => {
    totalMonthlyIncome += Number(inc.amount) || 0;
    if (inc.stability === 'HIGH') {
      stableIncome += Number(inc.amount) || 0;
    }
  });

  if (totalMonthlyIncome === 0) {
    totalMonthlyIncome = profile.monthlyIncome || 25000;
  }

  // 2. 资金存储汇总
  const liquidCash = Number(savingsStorage.liquidCash) || 0;
  const fixedDeposits = Number(savingsStorage.fixedDeposits) || 0;
  const idleFunds = Number(savingsStorage.idleFunds) || 0;
  const totalStorage = liquidCash + fixedDeposits + idleFunds;

  // 3. 负债结构与分类诊断
  let totalDebtPrincipal = 0;
  let totalMonthlyDebtPayment = 0;
  const highInterestDebts = []; // 年化 > 7% 的高息负债
  const lowInterestDebts = [];  // 年化 <= 4.5% 的低息优质负债

  const processedDebts = debts.map(d => {
    const principal = Number(d.remainingPrincipal) || 0;
    const monthlyPayment = Number(d.monthlyPayment) || 0;
    const rate = Number(d.interestRate) || 0;

    totalDebtPrincipal += principal;
    totalMonthlyDebtPayment += monthlyPayment;

    const ratePercent = (rate * 100).toFixed(2) + '%';

    // 判断负债性质与还款优先级
    let priority = 'MEDIUM';
    let priorityText = '正常按月还款';
    let priorityBadge = 'badge-info';

    if (rate >= 0.07) {
      priority = 'HIGH_URGENT';
      priorityText = '优先提前结清 (高息风险)';
      priorityBadge = 'badge-warning';
      highInterestDebts.push({ ...d, ratePercent });
    } else if (rate <= 0.045) {
      priority = 'LOW_ARBITRAGE';
      priorityText = '低息按月偿还 (套利优选)';
      priorityBadge = 'badge-success';
      lowInterestDebts.push({ ...d, ratePercent });
    }

    return {
      ...d,
      principal: Math.round(principal),
      monthlyPayment: Math.round(monthlyPayment),
      ratePercent,
      priority,
      priorityText,
      priorityBadge
    };
  });

  // 4. 核心财务风险指标计算
  // 债务收入比 (Debt Service Ratio, DSR)
  const dsr = totalMonthlyIncome > 0 ? (totalMonthlyDebtPayment / totalMonthlyIncome) * 100 : 0;
  let dsrStatus = 'HEALTHY';
  let dsrText = '健康 (DSR ≤ 30%)';
  let dsrBadge = 'badge-success';

  if (dsr > 30 && dsr <= 50) {
    dsrStatus = 'WARNING';
    dsrText = '偏高 (30% < DSR ≤ 50%)';
    dsrBadge = 'badge-gold';
  } else if (dsr > 50) {
    dsrStatus = 'CRITICAL';
    dsrText = '高危 (DSR > 50%)';
    dsrBadge = 'badge-warning';
  }

  // 应急安全垫覆盖月数
  const emergencyCoverageMonths = monthlyFixedExpense > 0 ? (liquidCash / monthlyFixedExpense).toFixed(1) : 0;

  // 5. 综合财务健康评分 (0 ~ 100分)
  let healthScore = 100;
  if (dsr > 30) healthScore -= 15;
  if (dsr > 50) healthScore -= 25;
  if (highInterestDebts.length > 0) healthScore -= 20;
  if (liquidCash < monthlyFixedExpense * 6) healthScore -= 15;
  healthScore = Math.max(20, healthScore);

  // 6. 算法推演：最优资金处置与还债/定投方案 (Actionable Financial Strategy Plan)
  const actionPlans = [];

  // 规则 1：处理高息负债
  if (highInterestDebts.length > 0) {
    const totalHighDebt = highInterestDebts.reduce((sum, d) => sum + Number(d.remainingPrincipal), 0);
    const availablePayoffFunds = idleFunds + Math.max(0, liquidCash - monthlyFixedExpense * 6);
    
    if (availablePayoffFunds >= totalHighDebt) {
      actionPlans.push({
        step: 1,
        title: '🔴 【第一优先】动用闲置资金提前结清高息负债',
        type: 'DEBT_PAYOFF',
        detail: `检测到存在年化利率高达 7%~18% 的高息负债 (共计 ¥${totalHighDebt.toLocaleString()})。提前还清该负债相当于无风险获得 ${highInterestDebts[0].ratePercent} 的确定性投资收益！建议从闲置资金/储备中拔出 ¥${totalHighDebt.toLocaleString()} 立即提前还清，每月可省下 ¥${highInterestDebts.reduce((s,d)=>s+Number(d.monthlyPayment),0).toLocaleString()} 现金流！`
      });
    } else {
      actionPlans.push({
        step: 1,
        title: '🔴 【第一优先】全力集中资金加速偿还高息负债',
        type: 'DEBT_PAYOFF',
        detail: `当前闲置资金不足以一次性还清高息负债 (待还 ¥${totalHighDebt.toLocaleString()})。建议暂停新增股票定投，将每月剩余储蓄的 100% 集中用于强力攻坚提前还清高息负债！`
      });
    }
  } else {
    actionPlans.push({
      step: 1,
      title: '🟢 【无高息负债风险】财务杠杆结构健康',
      type: 'SAFE',
      detail: '未检测到年化 >7% 的消费贷或高息债务，财务抗风险基础良好。'
    });
  }

  // 规则 2：安全垫防守
  const requiredEmergency = monthlyFixedExpense * 6;
  if (liquidCash < requiredEmergency) {
    const gap = requiredEmergency - liquidCash;
    actionPlans.push({
      step: 2,
      title: '🛡️ 【第二优先】充实紧急备用金水池',
      type: 'CUSHION_FILL',
      detail: `当前活期备用金 (¥${liquidCash.toLocaleString()}) 距 6个月防线 (¥${requiredEmergency.toLocaleString()}) 尚差 ¥${gap.toLocaleString()}。建议优先将每月储蓄补充至该水池，保持绝对防御。`
    });
  } else {
    actionPlans.push({
      step: 2,
      title: '🛡️ 【防守达标】6个月紧急备用金已打满',
      type: 'SAFE',
      detail: `当前活期/货币基金储备达 ¥${liquidCash.toLocaleString()} (覆盖 ${emergencyCoverageMonths} 个月开支)，防守底线十分稳固。`
    });
  }

  // 规则 3：低息负债 vs 宽基定投跨期套利决策
  if (lowInterestDebts.length > 0) {
    const avgLowRate = lowInterestDebts[0].ratePercent;
    const spread = ((expectedAnnualReturn - Number(lowInterestDebts[0].interestRate)) * 100).toFixed(2);
    actionPlans.push({
      step: 3,
      title: '📈 【第三优先】低息房贷无需提前结清，保持定投套利',
      type: 'ARBITRAGE',
      detail: `您的住房按揭等负债年化利率仅约 ${avgLowRate}，而宽基指数长期定投预期年化约 8%~10%，存在约 +${spread}% 的跨期利差。**强烈建议按月正常还供，无需提前还清房贷**，将结余现金流投入指数定投，用资本复利打败房贷利息！`
    });
  }

  // 规则 4：最优月度现金流分配结构 (Recommended Monthly Allocation Matrix)
  const remainingForDca = Math.max(0, totalMonthlyIncome - monthlyFixedExpense - totalMonthlyDebtPayment);
  const monthlyAllocationAdvice = {
    fixedExpense: Math.round(monthlyFixedExpense),
    fixedExpensePct: ((monthlyFixedExpense / totalMonthlyIncome) * 100).toFixed(1) + '%',
    debtPayment: Math.round(totalMonthlyDebtPayment),
    debtPaymentPct: ((totalMonthlyDebtPayment / totalMonthlyIncome) * 100).toFixed(1) + '%',
    dcaInvestment: Math.round(remainingForDca),
    dcaInvestmentPct: ((remainingForDca / totalMonthlyIncome) * 100).toFixed(1) + '%'
  };

  return {
    metrics: {
      totalMonthlyIncome: Math.round(totalMonthlyIncome),
      stableIncome: Math.round(stableIncome),
      totalStorage: Math.round(totalStorage),
      liquidCash: Math.round(liquidCash),
      fixedDeposits: Math.round(fixedDeposits),
      idleFunds: Math.round(idleFunds),
      totalDebtPrincipal: Math.round(totalDebtPrincipal),
      totalMonthlyDebtPayment: Math.round(totalMonthlyDebtPayment),
      dsr: dsr.toFixed(1) + '%',
      dsrStatus,
      dsrText,
      dsrBadge,
      emergencyCoverageMonths,
      healthScore
    },
    debts: processedDebts,
    actionPlans,
    monthlyAllocationAdvice
  };
}

module.exports = {
  analyzeCapitalAndDebt
};
