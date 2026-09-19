let globalState = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchGlobalData();
  bindEvents();
});

async function fetchGlobalData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    globalState = data;

    const portfolioFunds = (data.fundPortfolio && data.fundPortfolio.funds) ? data.fundPortfolio.funds : data.trackedFunds;
    renderTopFundValuationBoard(portfolioFunds, data.indices);
    renderAllocationColumn(data.studentAllocation);
    renderStudentReportColumn(data.studentReport, data.studentGoals);
  } catch (err) {
    console.error('Failed to fetch data:', err);
  }
}

// 🌟 渲染顶部：5只持仓基金全景估值信号看板 (含月末净值表现与具体建议定投金额)
function renderTopFundValuationBoard(portfolioFunds = [], indices = []) {
  const gridContainer = document.getElementById('topFundCardsGrid');
  if (!gridContainer) return;

  const indexMap = {};
  indices.forEach(idx => { indexMap[idx.code] = idx; });

  if (!portfolioFunds || portfolioFunds.length === 0) {
    gridContainer.innerHTML = `<div style="color:#94a3b8; font-size:0.85rem;">暂无持仓基金数据</div>`;
    return;
  }

  gridContainer.innerHTML = portfolioFunds.map(fund => {
    const matchedIdx = indexMap[fund.benchmarkIndex] || { pePercentile: 50, name: '对标', monthlyChange: 0, lastDayNavStatus: '月末企稳' };
    const pePct = fund.pePercentile || matchedIdx.pePercentile || 50;
    const monthlyChange = fund.monthlyChange !== undefined ? fund.monthlyChange : (matchedIdx.monthlyChange || 0);
    const navStatus = fund.lastDayNavStatus || matchedIdx.lastDayNavStatus || '月末企稳';
    const dcaAmt = fund.plannedDcaAmount !== undefined ? fund.plannedDcaAmount : (fund.recommendedDca || 0);

    let badgeClass = 'badge-info';
    let directiveText = '标准 1.0x';

    if (pePct < 30) {
      badgeClass = 'badge-success';
      directiveText = '🟢 低估加码 1.5x';
    } else if (pePct >= 30 && pePct < 70) {
      badgeClass = 'badge-info';
      directiveText = '🟡 估值合理 1.0x';
    } else if (pePct >= 70 && pePct < 90) {
      badgeClass = 'badge-gold';
      directiveText = '🟡 高位减半 0.5x';
    } else if (pePct >= 90) {
      badgeClass = 'badge-warning';
      directiveText = '🔴 风险暂停 0.0x';
    }

    const changeColor = monthlyChange < 0 ? '#34d399' : (monthlyChange > 0 ? '#f87171' : '#cbd5e1');

    return `
      <div class="fund-card-item">
        <div class="fund-card-header">
          <div>
            <div class="fund-card-code">${fund.code} · ${fund.category || '板块标的'}</div>
            <div class="fund-card-name">${fund.name}</div>
          </div>
        </div>
        <div class="fund-card-meta">
          <span>当前持仓</span>
          <strong class="fund-card-holding">¥${Number(fund.marketValue || fund.units || 0).toLocaleString()}</strong>
        </div>
        <div class="fund-card-meta">
          <span>板块PE分位</span>
          <span class="fund-card-pe">${pePct}% (${matchedIdx.name || '对标'})</span>
        </div>
        <div class="fund-card-meta">
          <span>月末净值表现</span>
          <span style="font-size:0.75rem; color:${changeColor}; font-weight:600;">
            ${monthlyChange >= 0 ? '+' : ''}${monthlyChange}% (${navStatus})
          </span>
        </div>
        <div class="fund-card-footer">
          <span class="badge ${badgeClass}">${directiveText}</span>
          <span style="font-size:0.85rem; color:#34d399; font-weight:800; font-family:var(--font-heading);">
            <i class="fa-solid fa-calendar-check" style="margin-right:0.2rem; color:#f59e0b;"></i> 10月5号首笔划款 ¥${dcaAmt}
          </span>
        </div>



      </div>
    `;

  }).join('');
}


// 渲染左卡片：兼职动态入账与四水池划转指令站
function renderAllocationColumn(alloc) {
  if (!alloc) return;
  const { summary = {}, incomeStreams = [], directives = [] } = alloc;

  // 1. 资产与流动性 Banner
  const totalAssets = 4618; // 900零钱 + 600稳健 + 3118进阶(12只基金3718元)
  const totalDebt = summary.totalRemainingDebt || 8000;
  const netWorth = totalAssets - totalDebt;

  if (document.getElementById('dispTotalAssets')) {
    document.getElementById('dispTotalAssets').innerText = '¥' + totalAssets.toLocaleString();
  }
  if (document.getElementById('dispTotalDebt')) {
    document.getElementById('dispTotalDebt').innerText = '¥' + totalDebt.toLocaleString();
  }
  if (document.getElementById('dispNetWorth')) {
    const netElem = document.getElementById('dispNetWorth');
    netElem.innerText = `¥${netWorth.toLocaleString()}`;
    netElem.className = netWorth >= 0 ? 'text-green' : 'text-amber';
  }

  // 2. 划转 4 步 SOP
  document.getElementById('dirLiquidFloor').innerText = `保留 ¥${(summary.liquidCashFloor || 2000).toLocaleString()}`;
  document.getElementById('dirDebtPayment').innerText = `划款 ¥${(summary.debtPaymentThisMonth || 500).toLocaleString()}`;
  document.getElementById('dirGoalsAlloc').innerText = `划款 ¥${(summary.allocatedToGoals || 0).toLocaleString()}`;
  document.getElementById('dirDcaAlloc').innerText = `划款 ¥${(summary.allocatedToDca || 0).toLocaleString()}`;

  // 3. 基金定投细分划转清单
  const dcaContainer = document.getElementById('fundDcaList');
  if (dcaContainer) {
    if (!directives || directives.length === 0) {
      dcaContainer.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8;">暂无定投划转 (定投当前处于暂停状态)</div>`;
    } else {
      dcaContainer.innerHTML = directives.map(d => `
        <div class="fund-dca-item">
          <div>
            <span class="fname">${d.name} (${d.code})</span>
            <span class="badge ${d.badgeClass}" style="margin-left:0.4rem;">${d.strategyText}</span>
          </div>
          <span class="famt">划转 ¥${d.finalDcaAmount.toLocaleString()}</span>
        </div>
      `).join('');
    }
  }

  // 4. 收入流水记录
  const incContainer = document.getElementById('incomeItemsContainer');
  if (incContainer) {
    if (!incomeStreams || incomeStreams.length === 0) {
      incContainer.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8;">本月暂无兼职/生活费流水</div>`;
    } else {
      incContainer.innerHTML = incomeStreams.map(inc => `
        <div class="income-row">
          <div>
            <strong>${inc.name}</strong>
            <span class="badge ${inc.type === 'STIPEND' ? 'badge-info' : 'badge-gold'}" style="margin-left:0.4rem;">
              ${inc.type === 'STIPEND' ? '生活费' : '兼职/实习'}
            </span>
            <span style="font-size:0.72rem; color:#94a3b8; margin-left:0.4rem;">${inc.date || ''}</span>
          </div>
          <div>
            <span class="text-green" style="font-weight:700; margin-right:0.5rem;">+¥${Number(inc.amount).toLocaleString()}</span>
            <button class="btn btn-outline btn-sm" onclick="deleteIncome('${inc.id}')" style="padding:0.1rem 0.3rem;">&times;</button>
          </div>
        </div>
      `).join('');
    }
  }
}

// 渲染右卡片：三大专项目标进度与专家理财报告
function renderStudentReportColumn(report, goals) {
  if (!goals) goals = {};
  if (!report) report = {};

  // 1. 三大专项目标进度条
  const travelCurr = goals.travelCurrent || 0;
  const travelTgt = goals.travelTarget || 10000;
  const travelPct = Math.min(100, (travelCurr / travelTgt) * 100).toFixed(1);
  document.getElementById('travelProgText').innerText = `¥${travelCurr.toLocaleString()} (${travelPct}%)`;
  document.getElementById('barTravel').style.width = travelPct + '%';

  const rentCurr = goals.rentCurrent || 0;
  const rentTgt = goals.rentTarget || 2000;
  const rentPct = Math.min(100, (rentCurr / rentTgt) * 100).toFixed(1);
  document.getElementById('rentProgText').innerText = `¥${rentCurr.toLocaleString()} (${rentPct}%)`;
  document.getElementById('barRent').style.width = rentPct + '%';

  const gradCurr = goals.graduationReserveCurrent || 0;
  const gradTgt = goals.graduationReserveTarget || 5000;
  const gradPct = Math.min(100, (gradCurr / gradTgt) * 100).toFixed(1);
  document.getElementById('gradProgText').innerText = `¥${gradCurr.toLocaleString()} (${gradPct}%)`;
  document.getElementById('barGrad').style.width = gradPct + '%';

  // 2. 报告 Date Badge
  document.getElementById('reportDateBadge').innerText = report.reportDate || '今日最新';

  // 3. 专家指导文案
  if (document.getElementById('repCashAdvice')) {
    document.getElementById('repCashAdvice').innerHTML = report.cashAdvice || `当前手头现金 <strong>¥900</strong>（现金 ¥300 + 支付宝 ¥500 + 微信 ¥100）。`;
  }
  document.getElementById('repDebtAdvice').innerText = report.debtAdvice || '负债还款结构正常。';
  document.getElementById('repGoalAdvice').innerText = report.goalAdvice || '专项资金储备按计划推进中。';
  document.getElementById('repDcaAdvice').innerText = report.dcaAdvice || '坚持 500 元智能定投。';

  // 4. DeepSeek-V4-Pro 大模型研判渲染 (蒸馏巴菲特价值投资)
  if (document.getElementById('repDeepSeekAdvice')) {
    const ds = report.deepseekReport || {};
    const modelTag = ds.modelUsed || 'deepseek-v4-pro';
    const text = `【大模型与算法引擎】: ${modelTag} (🏛️ 蒸馏巴菲特三大价值投资定律)\n\n` +
                 `【巴菲特视角：安全边际与十五五研判】:\n${ds.macroInsight || '宏观方向明确，坚守安全边际。'}\n\n` +
                 `【“别人恐惧我贪婪”月末择时】:\n${ds.navTrendAnalysis || '月末回踩企稳，逆势打折吸筹。'}\n\n` +
                 `【巴菲特式 2026-2030 5年复利指引】:\n${ds.riskFiveYearAdvice || '保持 500 元智能定投。'}`;
    document.getElementById('repDeepSeekAdvice').innerText = text;
  }



  // 充填 Goals Modal 表单
  document.getElementById('goalTravelTarget').value = goals.travelTarget || 10000;
  document.getElementById('goalTravelCurrent').value = goals.travelCurrent || 0;
  document.getElementById('goalRentTarget').value = goals.rentTarget || 2000;
  document.getElementById('goalRentCurrent').value = goals.rentCurrent || 0;
  document.getElementById('goalGradTarget').value = goals.graduationReserveTarget || 5000;
  document.getElementById('goalGradCurrent').value = goals.graduationReserveCurrent || 0;
}

// 删除兼职/生活费流水
window.deleteIncome = async function(id) {
  if (!confirm('确定要删除这笔收入记录吗？已为您重新实时计算全月划转方案。')) return;
  const res = await fetch(`/api/income/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    fetchGlobalData();
  }
};

// 事件绑定
function bindEvents() {
  // Income Modal
  const incomeModal = document.getElementById('incomeModal');
  const openInc = () => {
    document.getElementById('incDate').value = new Date().toISOString().slice(0, 10);
    incomeModal.classList.add('active');
  };
  document.getElementById('btnOpenIncomeModal').addEventListener('click', openInc);
  document.getElementById('btnQuickAddIncome').addEventListener('click', openInc);
  document.getElementById('btnCloseIncomeModal').addEventListener('click', () => incomeModal.classList.remove('active'));
  document.getElementById('btnCancelIncomeModal').addEventListener('click', () => incomeModal.classList.remove('active'));

  // Submit Income Form
  document.getElementById('incomeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('incName').value,
      amount: document.getElementById('incAmount').value,
      date: document.getElementById('incDate').value,
      type: document.getElementById('incType').value
    };

    const res = await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      document.getElementById('incomeForm').reset();
      incomeModal.classList.remove('active');
      fetchGlobalData();
    }
  });

  // Fund Modal
  const fundModal = document.getElementById('fundModal');
  const openFundModal = () => fundModal.classList.add('active');
  if (document.getElementById('btnOpenFundModal')) {
    document.getElementById('btnOpenFundModal').addEventListener('click', openFundModal);
  }
  if (document.getElementById('btnManageFundsTop')) {
    document.getElementById('btnManageFundsTop').addEventListener('click', openFundModal);
  }
  document.getElementById('btnCloseFundModal').addEventListener('click', () => fundModal.classList.remove('active'));
  document.getElementById('btnCancelFundModal').addEventListener('click', () => fundModal.classList.remove('active'));


  // Submit Goals Form
  document.getElementById('goalsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      travelTarget: Number(document.getElementById('goalTravelTarget').value),
      travelCurrent: Number(document.getElementById('goalTravelCurrent').value),
      rentTarget: Number(document.getElementById('goalRentTarget').value),
      rentCurrent: Number(document.getElementById('goalRentCurrent').value),
      graduationReserveTarget: Number(document.getElementById('goalGradTarget').value),
      graduationReserveCurrent: Number(document.getElementById('goalGradCurrent').value)
    };

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      goalsModal.classList.remove('active');
      fetchGlobalData();
    }
  });
}
