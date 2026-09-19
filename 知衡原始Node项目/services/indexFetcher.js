/**
 * 多板块与宽基指数估值及月末净值表现获取服务
 */
async function fetchIndexValuations() {
  return [
    {
      code: '000300',
      name: '沪深300指数',
      category: 'A股核心大盘',
      pePercentile: 27.6,
      monthlyChange: -2.3,
      lastDayNavStatus: '月末底部回踩',
      signal: 'LOW',
      signalText: '🟢 低估黄金区 (1.5x加码)'
    },
    {
      code: '000905',
      name: '中证500指数',
      category: 'A股成长中盘',
      pePercentile: 19.8,
      monthlyChange: -3.8,
      lastDayNavStatus: '月末回踩企稳',
      signal: 'LOW',
      signalText: '🟢 低估黄金区 (1.5x加码)'
    },
    {
      code: 'AI_INDEX',
      name: '人工智能/AI科技板块',
      category: '前沿AI科技',
      pePercentile: 45.2,
      monthlyChange: +1.2,
      lastDayNavStatus: '月末震荡上行',
      signal: 'NORMAL',
      signalText: '🟡 估值合理 (1.0x定投)'
    },
    {
      code: 'CHIP_INDEX',
      name: '半导体芯片板块',
      category: '硬核半导体',
      pePercentile: 32.5,
      monthlyChange: -1.5,
      lastDayNavStatus: '月末温和回调',
      signal: 'NORMAL',
      signalText: '🟡 估值适中 (1.0x定投)'
    },
    {
      code: 'MEDICAL_INDEX',
      name: '医疗健康/医药板块',
      category: '医药创新',
      pePercentile: 18.5,
      monthlyChange: -4.2,
      lastDayNavStatus: '月末寻底震荡',
      signal: 'LOW',
      signalText: '🟢 深度低估 (1.5x加码)'
    },
    {
      code: 'ENERGY_INDEX',
      name: '新能源产业板块',
      category: '绿色新能源',
      pePercentile: 22.1,
      monthlyChange: -2.8,
      lastDayNavStatus: '月末筑底企稳',
      signal: 'LOW',
      signalText: '🟢 估值洼地 (1.5x加码)'
    },
    {
      code: 'HSTECH_INDEX',
      name: '恒生科技指数',
      category: '港股科技龙头',
      pePercentile: 28.0,
      monthlyChange: -1.8,
      lastDayNavStatus: '月末底部平稳',
      signal: 'LOW',
      signalText: '🟢 低估黄金区 (1.5x加码)'
    },
    {
      code: 'GOLD_INDEX',
      name: '黄金资产',
      category: '避险黄金',
      pePercentile: 85.0,
      monthlyChange: +4.5,
      lastDayNavStatus: '月末高位运行',
      signal: 'NORMAL',
      signalText: '🟡 高位防御 (0.5x减半)'
    },
    {
      code: 'BOND_INDEX',
      name: '纯债与信用债',
      category: '稳健防守',
      pePercentile: 50.0,
      monthlyChange: +0.25,
      lastDayNavStatus: '月末收益稳健',
      signal: 'NORMAL',
      signalText: '🛡️ 纯债稳健 (1.0x固收)'
    },
    {
      code: 'GROWTH_MIXED',
      name: '成长科技混合',
      category: '全市场成长',
      pePercentile: 38.0,
      monthlyChange: +0.8,
      lastDayNavStatus: '月末平稳交投',
      signal: 'NORMAL',
      signalText: '🟡 估值适中 (1.0x定投)'
    }
  ];
}

module.exports = {
  fetchIndexValuations
};
