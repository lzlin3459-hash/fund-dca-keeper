/**
 * 大四学生兼职收入动态分配算法引擎 (严格基于用户手动添加的实际收入)
 */
function calculateStudentAllocation(profile = {}, financials = {}, studentGoals = {}, trackedFunds = [], indices = []) {
  const {
    monthlyFixedExpense = 1500,
    liquidCashFloor = 2000
  } = profile;

  const {
    incomeStreams = [],
    debts = [],
    savingsStorage = { liquidCash: 900 }
  } = financials;

  const {
    travelTarget = 10000,
    travelCurrent = 0,
    rentTarget = 2000,
    rentCurrent = 0,
    graduationReserveTarget = 5000,
    graduationReserveCurrent = 0,
    targetMonthlyDcaMin = 500,
    targetMonthlyDcaMax = 1000
  } = studentGoals;

  // 1. 盘点当前手头现金总额 (现金 + 支付宝 + 微信)
  const currentCash = Number(savingsStorage.liquidCash) || 900;
  const cashGapToFloor = Math.max(0, liquidCashFloor - currentCash);

  // 2. 严格按用户实际添加的收入汇总（不添加任何虚构/默认兼职数据）
  let totalIncomeThisMonth = 0;
  let parttimeIncomeThisMonth = 0;
  let stipendIncomeThisMonth = 0;

  incomeStreams.forEach(inc => {
    const amt = Number(inc.amount) || 0;
    totalIncomeThisMonth += amt;
    if (inc.type === 'STIPEND') {
      stipendIncomeThisMonth += amt;
    } else {
      parttimeIncomeThisMonth += amt;
    }
  });

  // 3. 债务还款包
  let debtPaymentThisMonth = 0;
  let totalRemainingDebt = 0;
  debts.forEach(d => {
    debtPaymentThisMonth += Number(d.monthlyPayment) || 0;
    totalRemainingDebt += Number(d.remainingPrincipal) || 0;
  });

  // 4. 计算当月自由结余
  const rawSavings = Math.max(0, totalIncomeThisMonth - monthlyFixedExpense - debtPaymentThisMonth);

  // 5. 四水池逻辑：若暂无兼职收入，仅靠生活费时，结余为0，划转金额自然全为0，绝不捏造
  let allocatedToLiquidFill = 0;
  let allocatedToGoals = 0;
  let allocatedToDca = 0;

  let remaining = rawSavings;

  if (cashGapToFloor > 0 && remaining > 0) {
    allocatedToLiquidFill = Math.min(remaining, cashGapToFloor);
    remaining -= allocatedToLiquidFill;
  }

  if (remaining > 0) {
    if (remaining <= targetMonthlyDcaMin) {
      allocatedToDca = remaining;
    } else {
      allocatedToDca = Math.min(targetMonthlyDcaMax, Math.max(targetMonthlyDcaMin, Math.round(remaining * 0.4)));
      allocatedToGoals = remaining - allocatedToDca;
    }
  }

  // 6. 指数定投细分划转
  const indexMap = {};
  indices.forEach(idx => { indexMap[idx.code] = idx; });

  let weightedDcaSum = 0;
  const fundAllocations = trackedFunds.map(fund => {
    const matchedIndex = indexMap[fund.benchmarkIndex] || { pePercentile: 50 };
    const pePercentile = matchedIndex.pePercentile || 50;

    let multiplier = 1.0;
    let badgeClass = 'badge-info';
    let strategyText = '标准定投 (1.0x)';

    if (pePercentile < 30) {
      multiplier = 1.5;
      badgeClass = 'badge-success';
      strategyText = '低估加码 (1.5x)';
    } else if (pePercentile >= 90) {
      multiplier = 0.0;
      badgeClass = 'badge-warning';
      strategyText = '高估暂停 (0.0x)';
    }

    const baseDca = fund.baseMonthlyDca || 300;
    const weightedBase = baseDca * multiplier;
    weightedDcaSum += weightedBase;

    return {
      ...fund,
      pePercentile,
      multiplier,
      badgeClass,
      strategyText,
      weightedBase
    };
  });

  const dcaDirectives = fundAllocations.map(f => {
    let finalDcaAmount = 0;
    if (weightedDcaSum > 0) {
      finalDcaAmount = Math.round((f.weightedBase / weightedDcaSum) * allocatedToDca);
    }
    return {
      code: f.code,
      name: f.name,
      benchmarkIndex: f.benchmarkIndex,
      pePercentile: f.pePercentile,
      strategyText: f.strategyText,
      badgeClass: f.badgeClass,
      finalDcaAmount
    };
  });

  const travelPct = Math.min(100, ((travelCurrent / travelTarget) * 100)).toFixed(1);
  const rentPct = Math.min(100, ((rentCurrent / rentTarget) * 100)).toFixed(1);
  const gradPct = Math.min(100, ((graduationReserveCurrent / graduationReserveTarget) * 100)).toFixed(1);

  return {
    summary: {
      currentCash,
      cashGapToFloor,
      totalIncomeThisMonth: Math.round(totalIncomeThisMonth),
      stipendIncomeThisMonth: Math.round(stipendIncomeThisMonth),
      parttimeIncomeThisMonth: Math.round(parttimeIncomeThisMonth),
      monthlyFixedExpense: Math.round(monthlyFixedExpense),
      debtPaymentThisMonth: Math.round(debtPaymentThisMonth),
      totalRemainingDebt: Math.round(totalRemainingDebt),
      rawSavings: Math.round(rawSavings),
      allocatedToLiquidFill: Math.round(allocatedToLiquidFill),
      allocatedToGoals: Math.round(allocatedToGoals),
      allocatedToDca: Math.round(allocatedToDca),
      liquidCashFloor: Math.round(liquidCashFloor)
    },
    goals: {
      travelTarget,
      travelCurrent,
      travelPct,
      rentTarget,
      rentCurrent,
      rentPct,
      graduationReserveTarget,
      graduationReserveCurrent,
      gradPct
    },
    incomeStreams,
    directives: dcaDirectives
  };
}

module.exports = {
  calculateStudentAllocation
};
