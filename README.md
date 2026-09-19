# 知衡 · 基金定投系统

一个**全免费数据源**的个人基金长期定投管理工具：自动拉取真实指数估值与基金净值，按"巴菲特价值投资"逻辑（低估加码、高估减半）计算每月定投金额，帮你执行纪律化的长期定投。

> 数据全部来自免费公开接口（Baostock / AkShare / 天天基金 / 巨潮），无需注册、无需付费 token。

## ✨ 功能

- **真实估值**：自动拉取宽基指数历史 PE 分位、行业指数当前 PE
- **巴菲特定投乘数**：低估 1.5x 加码 / 合理 1.0x / 高位 0.5x 减半 / 高估 0.0x 暂停
- **真实基金净值**：天天基金接口，显示当前持仓盈亏
- **智能金额分配**：总预算按估值乘数自动分配到每只基金
- **交易日提醒**：自动算出本月实际定投日（避开周末与节假日）
- **四水池分配**：日常开销 / 还债 / 专项目标 / 定投的月度资金划转

## 📁 目录结构

```
├── webapp.py            # Flask 后端
├── get_invest_day.py    # 计算本月实际定投日（避开节假日）
├── store.example.json   # 账本模板（复制为 store.json 后填自己的数据）
├── services_py/
│   ├── valuator.py      # 指数真实估值引擎
│   ├── fund_nav.py       # 基金真实净值
│   ├── dca_strategy.py   # 巴菲特定投乘数
│   └── allocator.py      # 四水池分配
├── web/                 # 前端页面
└── 知衡定投系统.bat      # Windows 一键启动
```

## 🚀 快速开始

### 1. 环境要求
- Python 3.10+
- 依赖：`flask`, `baostock`, `akshare`, `pandas`

```bash
cd 项目目录
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install flask baostock akshare pandas
```

### 2. 配置你的账本
```bash
copy store.example.json store.json
# 编辑 store.json：填入你自己的基金、金额、目标
```

### 3. 启动
```bash
.venv\Scripts\python.exe webapp.py
# 浏览器打开 http://localhost:3000
```

Windows 用户直接双击 `知衡定投系统.bat`。

## 📊 配置说明

在 `store.json` 的 `trackedFunds` 里配置你的基金：
- `code`：基金代码
- `benchmarkIndex`：对标指数（000300/000905/AI_INDEX/CHIP_INDEX/DIVIDEND/BOND_INDEX）
- `baseMonthlyDca`：每月定投基数
- `targetShare`：目标仓位占比

在 `profile.plannedMonthlyDca` 设置每月总预算。

## ⚠️ 免责声明

本项目仅供学习与个人自用，所有数据来自公开免费接口，可能存在延迟或误差。**不构成任何投资建议**。基金有风险，投资需谨慎，历史数据不代表未来收益。

## 📄 License

MIT
