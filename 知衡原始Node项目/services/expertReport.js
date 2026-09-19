/**
 * 专家级大势研判与基金持仓诊断报告生成引擎
 */
function generateExpertReport(profile = {}, financials = {}, fundPortfolio = {}, indices = []) {
  const currentDateStr = new Date().toISOString().slice(0, 10);
  const { summary: fundSum = {}, funds = [], rebalancingAdvice = [] } = fundPortfolio;

  // 1. 市场大势与估值温度研判
  const lowIndices = indices.filter(i => i.pePercentile < 30);
  const highIndices = indices.filter(i => i.pePercentile >= 90);
  const normalIndices = indices.filter(i => i.pePercentile >= 30 && i.pePercentile < 90);

  let macroAnalysis = '';
  if (lowIndices.length > 0) {
    const names = lowIndices.map(i => `${i.name} (PE历史分位 ${i.pePercentile}%)`).join('、');
    macroAnalysis += `当前全市场呈现【结构性估值低洼】：${names} 处于历史底部 30% 分位以内，具备极高的安全边际与长线建仓性价比。`;
  }
  if (highIndices.length > 0) {
    const names = highIndices.map(i => `${i.name} (PE历史分位 ${i.pePercentile}%)`).join('、');
    macroAnalysis += ` ⚠️【风险红线警示】：${names} 处于历史 90% 以上极端高位风险区，已触发估值断路保护，建议暂停新增定投，防止高位追涨。`;
  }
  if (normalIndices.length > 0 && lowIndices.length === 0 && highIndices.length === 0) {
    macroAnalysis = `当前全市场估值处于历史中位合理区间，整体波动平稳，适合严格执行固定比例按月定投策略。`;
  }

  // 2. 基金持仓诊断与具体买卖调仓指令
  const fundDiagnoses = funds.map(fund => {
    let statusText = '';
    if (fund.pePercentile < 30) {
      statusText = `【强烈买入/加码 1.5x】估值处于${fund.pePercentile}%极低分位，建议利用当月沉淀资金优先划转补仓。`;
    } else if (fund.pePercentile >= 90) {
      statusText = `【停止扣款/止盈防守】对标指数估值达${fund.pePercentile}%高位风险区，停止新增定投，已有持仓可继续持有或适度分批止盈。`;
    } else {
      statusText = `【按计划定投 1.0x】估值处于${fund.pePercentile}%合理区间，严格按既定纪律分摊成本。`;
    }

    return {
      code: fund.code,
      name: fund.name,
      category: fund.category,
      marketValue: fund.marketValue,
      profit: fund.profit,
      profitRate: fund.profitRate,
      advice: statusText
    };
  });

  // 3. 财务资产与债务套利综合建议
  const debts = financials.debts || [];
  const mortgage = debts.find(d => d.category === 'MORTGAGE');
  let arbitrageAdvice = '';

  if (mortgage && Number(mortgage.interestRate) < 0.045) {
    arbitrageAdvice = `检测到您拥有年利率仅 ${(Number(mortgage.interestRate) * 100).toFixed(2)}% 的优质低息住房贷款。对比宽基指数历史年化约 8%~10% 的复利回报，存在确定性套利利差。**结论：切勿盲目提前还房贷**，保持按月正常还款，将沉淀资金持续投入宽基指数定投，利用复利打败贷款利息。`;
  } else {
    arbitrageAdvice = `建议保持紧急备用金充沛，将每月扣除必要开支后的剩余资金按纪律划转至宽基指数池。`;
  }

  return {
    reportDate: currentDateStr,
    title: `【知衡理财专家研判简报】(${currentDateStr})`,
    overallProfitRate: fundSum.profitRate || '0.00%',
    totalMarketValue: fundSum.totalMarketValue || 0,
    totalProfit: fundSum.totalProfit || 0,
    macroAnalysis,
    fundDiagnoses,
    rebalancingAdvice,
    arbitrageAdvice
  };
}

module.exports = {
  generateExpertReport
};
