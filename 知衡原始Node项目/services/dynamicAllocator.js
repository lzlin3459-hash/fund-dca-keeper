/**
 * 多源动态收入与实时资金分配算法引擎
 */
function calculateDynamicAllocation(profile = {}, financials = {}, trackedFunds = [], indices = []) {
  const {
    monthlyFixedExpense = 6000,
    emergencyFundTargetMonths = 6,
    currentEmergencyFund = 36000
  } = profile;

  const {
    incomeStreams = [
      { id: 'inc_1', name: '主业税后薪资', amount: 22000, date: '2026-08-01', type: 'SALARY' },
      { id: 'inc_2', name: '兼职/副业收入', amount: 3000, date: '2026-08-15', type: 'SIDE_HUSTLE' }
    ],
    debts = []
  } = financials;

  // 1. 汇总当月累计到账总收入
  let totalIncomeThisMonth = 0;
  incomeStreams.forEach(inc => {
    totalIncomeThisMonth += Number(inc.amount) || 0;
  });

  if (totalIncomeThisMonth === 0) {
    totalIncomeThisMonth = profile.monthlyIncome || 25000;
  }

  // 2. 必备开支与债务划转
  const fixedExpense = Number(monthlyFixedExpense) || 6000;
  let totalMonthlyDebtPayment = 0;
  debts.forEach(d => {
    totalMonthlyDebtPayment += Number(d.monthlyPayment) || 0;
  });

  // 3. 计算可支配储蓄额
  const rawSavings = Math.max(0, totalIncomeThisMonth - fixedExpense - totalMonthlyDebtPayment);
  const actualSavingsRate = totalIncomeThisMonth > 0 ? (rawSavings / totalIncomeThisMonth) : 0;

  // 4. 安全垫水池校验
  const requiredEmergencyFund = fixedExpense * emergencyFundTargetMonths;
  const emergencyGap = Math.max(0, requiredEmergencyFund - currentEmergencyFund);

  let allocatedToEmergency = 0;
  let netAvailableForDca = rawSavings;

  if (emergencyGap > 0) {
    // 优先将储蓄用于补充安全垫
    allocatedToEmergency = Math.min(rawSavings, emergencyGap);
    netAvailableForDca = rawSavings - allocatedToEmergency;
  }

  // 5. 结合估值分位数，将余量极速分配至各定投基金
  const indexMap = {};
  indices.forEach(idx => { indexMap[idx.code] = idx; });

  let weightedDcaSum = 0;
  const fundAllocations = trackedFunds.map(fund => {
    const matchedIndex = indexMap[fund.benchmarkIndex] || { pePercentile: 50 };
    const pePercentile = matchedIndex.pePercentile || 50;

    let multiplier = 1.0;
    let strategyText = '标准定投 (1.0x)';
    let badgeClass = 'badge-info';

    if (pePercentile < 30) {
      multiplier = 1.5;
      strategyText = '低估加码 (1.5x)';
      badgeClass = 'badge-success';
    } else if (pePercentile >= 30 && pePercentile < 70) {
      multiplier = 1.0;
      strategyText = '标准定投 (1.0x)';
      badgeClass = 'badge-info';
    } else if (pePercentile >= 70 && pePercentile < 90) {
      multiplier = 0.5;
      strategyText = '高估减半 (0.5x)';
      badgeClass = 'badge-gold';
    } else if (pePercentile >= 90) {
      multiplier = 0.0;
      strategyText = '高估暂停 (0.0x)';
      badgeClass = 'badge-warning';
    }

    const baseDca = fund.baseMonthlyDca || 2000;
    const weightedBase = baseDca * multiplier;
    weightedDcaSum += weightedBase;

    return {
      ...fund,
      pePercentile,
      multiplier,
      strategyText,
      badgeClass,
      weightedBase
    };
  });

  // 根据实际可用于定投的资金按权重划算最终指令
  const dcaDirectives = fundAllocations.map(f => {
    let finalDcaAmount = 0;
    if (weightedDcaSum > 0) {
      finalDcaAmount = Math.round((f.weightedBase / weightedDcaSum) * netAvailableForDca);
    }

    return {
      code: f.code,
      name: f.name,
      category: f.category,
      benchmarkIndex: f.benchmarkIndex,
      pePercentile: f.pePercentile,
      strategyText: f.strategyText,
      badgeClass: f.badgeClass,
      finalDcaAmount
    };
  });

  return {
    summary: {
      totalIncomeThisMonth: Math.round(totalIncomeThisMonth),
      fixedExpense: Math.round(fixedExpense),
      totalMonthlyDebtPayment: Math.round(totalMonthlyDebtPayment),
      rawSavings: Math.round(rawSavings),
      actualSavingsRate: (actualSavingsRate * 100).toFixed(1) + '%',
      allocatedToEmergency: Math.round(allocatedToEmergency),
      netAvailableForDca: Math.round(netAvailableForDca),
      incomeStreamCount: incomeStreams.length
    },
    incomeStreams,
    directives: dcaDirectives
  };
}

module.exports = {
  calculateDynamicAllocation
};
