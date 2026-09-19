"""
allocator.py — 四水池资金分配（从知衡 studentAllocator.js 翻译）
顺序：补活期防守线 -> 专项攒钱 -> 指数定投
"""
from __future__ import annotations


def allocate(profile: dict, financials: dict, goals: dict, funds: list, indices: dict) -> dict:
    fixed_exp = profile.get("monthlyFixedExpense", 1500)
    cash_floor = profile.get("liquidCashFloor", 2000)

    storage = financials.get("savingsStorage", {})
    cash = float(storage.get("liquidCash", 900) or 900)
    cash_gap = max(0, cash_floor - cash)

    # 收入汇总
    income_streams = financials.get("incomeStreams", [])
    total_inc = sum(float(s.get("amount", 0) or 0) for s in income_streams)

    # 债务
    debts = financials.get("debts", [])
    debt_pay = sum(float(d.get("monthlyPayment", 0) or 0) for d in debts)
    debt_left = sum(float(d.get("remainingPrincipal", 0) or 0) for d in debts)

    # 自由结余
    raw_save = max(0, total_inc - fixed_exp - debt_pay)

    # 四水池
    to_liquid = to_goals = to_dca = 0
    remain = raw_save
    if cash_gap > 0 and remain > 0:
        to_liquid = min(remain, cash_gap)
        remain -= to_liquid

    dca_min = goals.get("targetMonthlyDcaMin", 500)
    dca_max = goals.get("targetMonthlyDcaMax", 1000)
    if remain > 0:
        if remain <= dca_min:
            to_dca = remain
        else:
            to_dca = min(dca_max, max(dca_min, round(remain * 0.4)))
            to_goals = remain - to_dca

    # 目标进度
    def pct(cur, tgt):
        return round(min(100, cur / tgt * 100), 1) if tgt else 0

    return {
        "summary": {
            "currentCash": round(cash), "cashGapToFloor": round(cash_gap),
            "totalIncomeThisMonth": round(total_inc),
            "monthlyFixedExpense": round(fixed_exp),
            "debtPaymentThisMonth": round(debt_pay),
            "totalRemainingDebt": round(debt_left),
            "rawSavings": round(raw_save),
            "allocatedToLiquidFill": round(to_liquid),
            "allocatedToGoals": round(to_goals),
            "allocatedToDca": round(to_dca),
            "liquidCashFloor": round(cash_floor)
        },
        "goals": {
            "travelPct": pct(goals.get("travelCurrent", 0), goals.get("travelTarget", 1)),
            "rentPct": pct(goals.get("rentCurrent", 0), goals.get("rentTarget", 1)),
            "gradPct": pct(goals.get("graduationReserveCurrent", 0), goals.get("graduationReserveTarget", 1)),
        },
        "incomeStreams": income_streams
    }
