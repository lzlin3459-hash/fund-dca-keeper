"""
dca_strategy.py — 巴菲特价值投资定投引擎（从知衡 JS 翻译）
安全边际乘数 × 逆向贪婪乘数，按权重分配月度定投预算
"""
from __future__ import annotations


def pe_multiplier(pe_pct: float) -> tuple[float, str, str]:
    """返回 (乘数, 动作文案, badge类)"""
    if pe_pct < 30:
        return 1.5, "低估加码定投 (1.5x)", "badge-success"
    elif pe_pct < 70:
        return 1.0, "按计划标准定投 (1.0x)", "badge-info"
    elif pe_pct < 90:
        return 0.5, "高估减半定投 (0.5x)", "badge-gold"
    else:
        return 0.0, "风险暂停定投 (0.0x)", "badge-warning"


def nav_multiplier(month_change: float) -> float:
    """别人恐惧我贪婪：月跌加码，月涨收敛"""
    if month_change <= -3.0:
        return 1.15
    elif month_change < 0:
        return 1.08
    elif month_change < 4.0:
        return 1.0
    else:
        return 0.9


def analyze_portfolio(funds: list, indices: list, monthly_budget: float = 500) -> dict:
    """
    funds: [{code,name,benchmarkIndex,targetShare,units,avgCost,baseMonthlyDca,currentNav}]
    indices: [{code, pePercentile, monthlyChange}]
    """
    if not funds:
        return {"summary": {}, "funds": [], "rebalancing": []}

    idx_map = {i["code"]: i for i in indices}
    total_cost = total_mv = total_score = 0.0
    processed = []

    for f in funds:
        cost = f.get("units", 0) * f.get("avgCost", 0)
        mv = f.get("units", 0) * f.get("currentNav", 1.0)
        total_cost += cost
        total_mv += mv

        idx = idx_map.get(f.get("benchmarkIndex"), {"pePercentile": 50, "monthlyChange": 0})
        pe_pct = idx.get("pePercentile", 50)
        mchg = idx.get("monthlyChange", 0)

        pm, action, badge = pe_multiplier(pe_pct)
        nm = nav_multiplier(mchg)
        base = f.get("baseMonthlyDca", 100)
        score = base * pm * nm
        total_score += score

        processed.append({
            **f,
            "cost": round(cost), "marketValue": round(mv),
            "profit": round(mv - cost),
            "profitRate": f"{(mv-cost)/cost*100:.2f}%" if cost > 0 else "0.00%",
            "pePercentile": pe_pct, "monthlyChange": mchg,
            "peMultiplier": pm, "navMultiplier": round(nm, 2),
            "baseDca": round(base),
            "combinedScore": score, "strategyAction": action, "actionBadgeClass": badge,
            "plannedDcaAmount": 0
        })

    # 按权重分配预算
    allocated = 0
    for p in processed:
        p["plannedDcaAmount"] = round(p["combinedScore"] / total_score * monthly_budget) if total_score > 0 else 0
        allocated += p["plannedDcaAmount"]

    # 再平衡建议（偏离目标 ±5%）
    rebal = []
    for p in processed:
        actual = p["marketValue"] / total_mv if total_mv > 0 else 0
        target = p.get("targetShare", 0)
        dev = (actual - target) * 100
        p["actualSharePct"] = f"{actual*100:.1f}%"
        p["targetSharePct"] = f"{target*100:.1f}%"
        p["deviation"] = f"{'+' if dev>=0 else ''}{dev:.1f}%"
        if dev >= 5:
            rebal.append(f"⚠️ 【止盈再平衡】{p['name']} 占比 {p['actualSharePct']} 超目标 {p['targetSharePct']}，建议止盈超出部分。")
        elif dev <= -5:
            rebal.append(f"🟢 【低补再平衡】{p['name']} 占比 {p['actualSharePct']} 低于目标 {p['targetSharePct']}，具备低位补仓性价比。")

    return {
        "summary": {
            "totalCost": round(total_cost), "totalMarketValue": round(total_mv),
            "totalProfit": round(total_mv - total_cost),
            "profitRate": f"{(total_mv-total_cost)/total_cost*100:.2f}%" if total_cost > 0 else "0.00%",
            "recommendedMonthlyTotalDca": allocated
        },
        "funds": processed,
        "rebalancing": rebal
    }
