const express = require('express');
const cors = require('cors');
const path = require('path');
const { readStore, writeStore } = require('./db');
const { fetchIndexValuations } = require('./services/indexFetcher');
const { analyzeFundPortfolio } = require('./services/dcaStrategy');
const { calculateStudentAllocation } = require('./services/studentAllocator');
const { generateStudentReport } = require('./services/studentReport');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: 获取全局大四专属理财数据
app.get('/api/data', async (req, res) => {
  let store = readStore();
  if (!store) {
    return res.status(500).json({ error: 'Failed to read database store' });
  }

  const indices = await fetchIndexValuations();
  const fundPortfolio = analyzeFundPortfolio(store.trackedFunds || [], indices);
  const studentAllocation = calculateStudentAllocation(
    store.profile || {},
    store.financials || {},
    store.studentGoals || {},
    store.trackedFunds || [],
    indices
  );
  const studentReport = await generateStudentReport(
    store.profile || {},
    store.financials || {},
    store.studentGoals || {},
    fundPortfolio,
    indices
  );


  res.json({
    profile: store.profile || {},
    studentGoals: store.studentGoals || {},
    financials: store.financials || {},
    trackedFunds: store.trackedFunds || [],
    indices,
    fundPortfolio,
    studentAllocation,
    studentReport
  });
});

// API: 更新大四专项目标参数 (旅游金、毕业租房备用金进度)
app.post('/api/goals', (req, res) => {
  let store = readStore();
  if (!store) return res.status(500).json({ error: 'Database store missing' });

  store.studentGoals = {
    ...store.studentGoals,
    ...req.body
  };

  if (writeStore(store)) {
    res.json({ success: true, studentGoals: store.studentGoals });
  } else {
    res.status(500).json({ error: 'Failed to update goals' });
  }
});

// API: 登记兼职/生活费收入
app.post('/api/income', (req, res) => {
  let store = readStore();
  if (!store) return res.status(500).json({ error: 'Database store missing' });

  const { name, amount, date, type } = req.body;
  if (!name || !amount) {
    return res.status(400).json({ error: 'Income name and amount are required' });
  }

  if (!store.financials) store.financials = {};
  if (!store.financials.incomeStreams) store.financials.incomeStreams = [];

  const newStream = {
    id: 'inc_' + Date.now(),
    name,
    amount: Number(amount),
    date: date || new Date().toISOString().slice(0, 10),
    type: type || 'SIDE_HUSTLE'
  };

  store.financials.incomeStreams.push(newStream);

  // 动态更新月总收入
  let totalIncome = 0;
  store.financials.incomeStreams.forEach(s => totalIncome += Number(s.amount));
  store.profile.monthlyIncome = totalIncome;

  if (writeStore(store)) {
    res.json({ success: true, newStream, totalIncome });
  } else {
    res.status(500).json({ error: 'Failed to save income' });
  }
});

// API: 删除某笔收入
app.delete('/api/income/:id', (req, res) => {
  let store = readStore();
  if (!store) return res.status(500).json({ error: 'Database store missing' });

  const { id } = req.params;
  if (store.financials && store.financials.incomeStreams) {
    store.financials.incomeStreams = store.financials.incomeStreams.filter(s => s.id !== id);
    let totalIncome = 0;
    store.financials.incomeStreams.forEach(s => totalIncome += Number(s.amount));
    store.profile.monthlyIncome = Math.max(0, totalIncome);
  }

  if (writeStore(store)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete income' });
  }
});

// API: 添加或修改持仓基金
app.post('/api/funds', (req, res) => {
  let store = readStore();
  if (!store) return res.status(500).json({ error: 'Database store missing' });

  const { code, name, benchmarkIndex, category, targetShare, units, avgCost, currentNav, baseMonthlyDca } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Fund code and name are required' });
  }

  if (!store.trackedFunds) store.trackedFunds = [];

  const existingIdx = store.trackedFunds.findIndex(f => f.code === code);
  const fundData = {
    code,
    name,
    benchmarkIndex: benchmarkIndex || '000300',
    category: category || '宽基指数',
    targetShare: Number(targetShare) || 0.50,
    units: Number(units) || 0,
    avgCost: Number(avgCost) || 0,
    currentNav: Number(currentNav) || 1.0,
    baseMonthlyDca: Number(baseMonthlyDca) || 300
  };

  if (existingIdx >= 0) {
    store.trackedFunds[existingIdx] = fundData;
  } else {
    store.trackedFunds.push(fundData);
  }

  if (writeStore(store)) {
    res.json({ success: true, fund: fundData });
  } else {
    res.status(500).json({ error: 'Failed to save fund' });
  }
});

// API: 删除持仓基金
app.delete('/api/funds/:code', (req, res) => {
  let store = readStore();
  if (!store) return res.status(500).json({ error: 'Database store missing' });

  const { code } = req.params;
  if (!store.trackedFunds) store.trackedFunds = [];

  store.trackedFunds = store.trackedFunds.filter(f => f.code !== code);

  if (writeStore(store)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete fund' });
  }
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 知衡·大四专属理财系统启动成功！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
