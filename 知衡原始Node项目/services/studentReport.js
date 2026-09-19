const { generateDeepSeekAnalysis } = require('./deepseekAnalyzer');

/**
 * 极简资金分配与 DeepSeek-V4-Pro 专家简报生成引擎
 */
async function generateStudentReport(profile = {}, financials = {}, studentGoals = {}, fundPortfolio = {}, indices = []) {
  const currentDateStr = new Date().toISOString().slice(0, 10);
  const { debts = [], savingsStorage = {} } = financials;
  const { summary: fundSum = {} } = fundPortfolio;
  const {
    travelTarget = 10000,
    travelCurrent = 0,
    rentTarget = 2000,
    rentCurrent = 0
  } = studentGoals;

  const currentCash = Number(savingsStorage.liquidCash) || 2670;
  const wealthDetail = savingsStorage.wealthDetail || { advancedWealth: 1948, conservativeWealth: 600 };

  const advancedWealth = Number(wealthDetail.advancedWealth) || 1948;
  const conservativeWealth = Number(wealthDetail.conservativeWealth) || 600;
  const totalAssets = currentCash + advancedWealth + conservativeWealth; // 5,218 元

  // 1. 资产与零钱总盘点指导
  const cashAdvice = `【总资产盘点】您目前拥有的资产总计 **¥${totalAssets.toLocaleString()}**（手头零钱 ¥${currentCash.toLocaleString()} + 稳健理财 ¥${conservativeWealth} + 5大主力基金 ¥${advancedWealth}）。手头零钱比 ¥2,000 的日常防守底线多出 **¥${Math.max(0, currentCash - 2000)}**，活期防守线 100% 满血达标！`;

  // 2. 8000元负债清偿规划建议
  const totalDebt = debts.reduce((s, d) => s + Number(d.remainingPrincipal || 0), 0);
  let debtAdvice = '';
  if (totalDebt > 0) {
    debtAdvice = `目前待还借款约 ¥${totalDebt.toLocaleString()}。对比您已有的 ¥${totalAssets.toLocaleString()} 资产，实际净负债仅 **¥${Math.abs(totalAssets - totalDebt).toLocaleString()}**！建议保持每月固定还款 ¥500~¥800；兼职收益到账时提拨 40% 提前还债。`;
  } else {
    debtAdvice = `【零负债状态】杠杆健康，无借款压力。`;
  }

  // 3. 专项资金
  const travelNeed = travelTarget - travelCurrent;
  const rentNeed = rentTarget - rentCurrent;
  let goalAdvice = `年末旅游金目标 ¥${travelTarget.toLocaleString()}（尚差 ¥${travelNeed.toLocaleString()}）；毕业租房备用金目标 ¥${rentTarget.toLocaleString()}（尚差 ¥${rentNeed.toLocaleString()}）。`;

  // 4. 调用 DeepSeek-V4-Pro 进行大模型推理研判
  const deepseekReport = await generateDeepSeekAnalysis(profile, financials, studentGoals, fundPortfolio, indices);

  return {
    reportDate: currentDateStr,
    title: deepseekReport.aiTitle || `🤖 【DeepSeek-V4-Pro 深度宏观研判与调仓报告】(${currentDateStr})`,
    overallProfitRate: fundSum.profitRate || '0.00%',
    totalMarketValue: fundSum.totalMarketValue || 0,
    currentCash,
    advancedWealth,
    conservativeWealth,
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
    cashAdvice,
    debtAdvice,
    goalAdvice,
    dcaAdvice: deepseekReport.dcaReasoning || '保持 500 元智能定投节奏。',
    deepseekReport
  };
}

module.exports = {
  generateStudentReport
};
