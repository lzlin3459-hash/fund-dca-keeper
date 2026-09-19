"""
webapp.py — 知衡·基金定投系统 Flask 后端
真实数据版：Baostock/akshare 真实估值 + 基金真实净值 + 巴菲特定投算法
运行：.venv\\Scripts\\python.exe webapp.py  -> http://localhost:3000
"""
import json
import os
from datetime import date
from flask import Flask, jsonify, request, send_from_directory

from services_py import valuator, fund_nav
from services_py.dca_strategy import analyze_portfolio
from services_py.allocator import allocate

BASE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(BASE, "store.json")
WEB = os.path.join(BASE, "web")

app = Flask(__name__, static_folder=WEB, static_url_path="")


def read_store():
    with open(STORE, encoding="utf-8") as f:
        return json.load(f)


def write_store(s):
    with open(STORE, "w", encoding="utf-8") as f:
        json.dump(s, f, ensure_ascii=False, indent=2)


def build_full_data():
    store = read_store()
    profile = store.get("profile", {})
    goals = store.get("studentGoals", {})
    financials = store.get("financials", {})
    funds = store.get("trackedFunds", [])

    # 1) 真实指数估值
    indices = valuator.get_index_valuations()

    # 2) 真实基金净值，更新 currentNav
    real_funds = []
    for f in funds:
        nav_info = fund_nav.get_fund_nav(f["code"])
        f["currentNav"] = nav_info["nav"]
        f["realNav"] = nav_info["real"]
        f["dailyPct"] = nav_info["daily_pct"]
        # 基金月涨跌注入对应指数的 monthlyChange
        real_funds.append(f)

    # 3) 巴菲特定投分配
    budget = profile.get("plannedMonthlyDca", goals.get("targetMonthlyDcaMin", 500))
    fund_portfolio = analyze_portfolio(real_funds, indices, budget)

    # 4) 四水池分配
    student_alloc = allocate(profile, financials, goals, real_funds, indices)

    # 5) 报告文案
    ss = financials.get("savingsStorage", {})
    cash = float(ss.get("liquidCash", 0) or 0)
    wealth = ss.get("wealthDetail", {})
    advanced = float(wealth.get("advancedWealth", 0) or 0)
    conservative = float(wealth.get("conservativeWealth", 0) or 0)
    total_assets = cash + advanced + conservative
    total_debt = sum(float(d.get("remainingPrincipal", 0) or 0) for d in financials.get("debts", []))

    today = date.today().isoformat()
    student_report = {
        "reportDate": today,
        "cashAdvice": f"【总资产盘点】当前资产约 ¥{total_assets:,.0f}（零钱¥{cash:,.0f}+稳健理财¥{conservative:,.0f}+基金¥{advanced:,.0f}）。活期防守线 ¥{profile.get('liquidCashFloor',2000):,.0f}。",
        "debtAdvice": (f"待还借款约 ¥{total_debt:,.0f}。建议保持月还 ¥{sum(float(d.get('monthlyPayment',0) or 0) for d in financials.get('debts',[])):,.0f}，兼职大额入账时提拨40%提前还债。"
                      if total_debt > 0 else "【零负债】杠杆健康。"),
        "goalAdvice": f"旅游金 ¥{goals.get('travelCurrent',0)}/{goals.get('travelTarget',1)}；毕业租房 ¥{goals.get('rentCurrent',0)}/{goals.get('rentTarget',1)}；毕业备用 ¥{goals.get('graduationReserveCurrent',0)}/{goals.get('graduationReserveTarget',1)}。",
        "dcaAdvice": f"按真实估值：低估板块1.5倍加码，高估板块0.5倍收敛，详见上方基金卡片。",
        "deepseekReport": {
            "modelUsed": "真实估值引擎(Baostock/akshare)",
            "macroInsight": f"宽基估值分位：沪深300={next((i['pePercentile'] for i in indices if i['code']=='000300'),'?')}%，中证500={next((i['pePercentile'] for i in indices if i['code']=='000905'),'?')}%。分位越低安全边际越大，定投加码越多。",
            "navTrendAnalysis": "月跌>3%触发1.15倍逆势低吸，月涨>4%收敛至0.9倍。",
            "riskFiveYearAdvice": "坚持每月定投纪律，不追涨杀跌，预留6个月应急金，跨越牛熊周期。"
        }
    }

    return {
        "profile": profile, "studentGoals": goals, "financials": financials,
        "trackedFunds": real_funds, "indices": indices,
        "fundPortfolio": fund_portfolio, "studentAllocation": student_alloc,
        "studentReport": student_report
    }


@app.get("/api/data")
def api_data():
    try:
        return jsonify(build_full_data())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/goals")
def api_goals():
    s = read_store()
    s["studentGoals"] = {**s.get("studentGoals", {}), **request.json}
    write_store(s)
    return jsonify({"success": True, "studentGoals": s["studentGoals"]})


@app.post("/api/income")
def api_income():
    s = read_store()
    b = request.json
    if not b.get("name") or not b.get("amount"):
        return jsonify({"error": "need name & amount"}), 400
    s.setdefault("financials", {}).setdefault("incomeStreams", [])
    s["financials"]["incomeStreams"].append({
        "id": "inc_" + str(__import__("time").time()),
        "name": b["name"], "amount": float(b["amount"]),
        "date": b.get("date", date.today().isoformat()), "type": b.get("type", "SIDE_HUSTLE")
    })
    s["profile"]["monthlyIncome"] = sum(float(x["amount"]) for x in s["financials"]["incomeStreams"])
    write_store(s)
    return jsonify({"success": True})


@app.delete("/api/income/<iid>")
def api_del_income(iid):
    s = read_store()
    streams = s.get("financials", {}).get("incomeStreams", [])
    s["financials"]["incomeStreams"] = [x for x in streams if x["id"] != iid]
    s["profile"]["monthlyIncome"] = sum(float(x["amount"]) for x in s["financials"]["incomeStreams"])
    write_store(s)
    return jsonify({"success": True})


@app.post("/api/funds/batch")
def api_fund_batch():
    """批量更新各基金的每月定投基数 baseMonthlyDca"""
    s = read_store()
    updates = request.json or {}
    changed = 0
    for f in s.get("trackedFunds", []):
        if f["code"] in updates:
            f["baseMonthlyDca"] = float(updates[f["code"]])
            changed += 1
    write_store(s)
    return jsonify({"success": True, "changed": changed})


@app.post("/api/funds")
def api_fund():
    s = read_store()
    b = request.json
    s.setdefault("trackedFunds", [])
    idx = next((i for i, x in enumerate(s["trackedFunds"]) if x["code"] == b["code"]), -1)
    node = {
        "code": b["code"], "name": b["name"],
        "benchmarkIndex": b.get("benchmarkIndex", "000300"),
        "category": b.get("category", "宽基指数"),
        "targetShare": float(b.get("targetShare", 0.2)),
        "units": float(b.get("units", 0)), "avgCost": float(b.get("avgCost", 1.0)),
        "currentNav": float(b.get("currentNav", 1.0)),
        "baseMonthlyDca": float(b.get("baseMonthlyDca", 100))
    }
    if idx >= 0:
        s["trackedFunds"][idx] = node
    else:
        s["trackedFunds"].append(node)
    write_store(s)
    return jsonify({"success": True, "fund": node})


@app.delete("/api/funds/<code>")
def api_del_fund(code):
    s = read_store()
    s["trackedFunds"] = [x for x in s.get("trackedFunds", []) if x["code"] != code]
    write_store(s)
    return jsonify({"success": True})


@app.get("/")
def index():
    return send_from_directory(WEB, "index.html")


if __name__ == "__main__":
    print("=" * 50)
    print("知衡·基金定投系统（真实数据版）启动中...")
    print("访问: http://localhost:3000")
    print("=" * 50)
    app.run(host="127.0.0.1", port=3000, debug=False)
