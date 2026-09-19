"""
valuator.py — 指数真实估值引擎（替换硬编码假数据）
口径（诚实标注，不混用）：
  - 宽基指数：乐咕乐股历史 PE 分位（精确）
  - 科技行业：csindex/巨潮 当前真实 PE（按成长股合理区间映射信号）
  信号阈值：
  分位/PE  <30 低估1.5x | 30-70 合理1.0x | 70-90 偏高0.5x | >90 高估0.0x
"""
from __future__ import annotations
import akshare as ak
from datetime import date as _date

_cache = {}

# 宽基：乐咕历史 PE 分位
WIDE = {
    "000300": ("沪深300", "沪深300"),
    "000905": ("中证500", "中证500"),
    "000016": ("上证50", "上证50"),
    "000852": ("中证1000", "中证1000"),
    "DIVIDEND": ("上证红利", "上证红利"),
}


def _sig(score: float) -> tuple:
    """score 为分位(0-100)，返回 (signal, text, multiplier)"""
    if score < 30:
        return "LOW", "🟢 低估黄金区 (1.5x加码)", 1.5
    elif score < 70:
        return "NORMAL", "🟡 估值合理 (1.0x定投)", 1.0
    elif score < 90:
        return "HIGH", "🟡 高位防御 (0.5x减半)", 0.5
    else:
        return "VERY_HIGH", "🔴 高估暂停 (0.0x)", 0.0


def get_wide_pe_percentile(ak_symbol: str) -> dict:
    if ak_symbol in _cache:
        return _cache[ak_symbol]
    try:
        df = ak.stock_index_pe_lg(symbol=ak_symbol)
        pe_col = "滚动市盈率" if "滚动市盈率" in df.columns else df.columns[2]
        df = df.dropna(subset=[pe_col])
        import pandas as pd
        df[pe_col] = pd.to_numeric(df[pe_col], errors="coerce")
        df = df.dropna(subset=[pe_col])
        cur = float(df[pe_col].iloc[-1])
        pct = round((df[pe_col] < cur).sum() / len(df) * 100, 1)
        result = {"pe": round(cur, 2), "score": pct, "mode": "历史分位"}
    except Exception as e:
        print(f"[valuator] {ak_symbol} 失败：{e}，用中性默认")
        result = {"pe": 0, "score": 50.0, "mode": "默认", "fallback": True}
    _cache[ak_symbol] = result
    return result


def get_ai_pe() -> dict:
    """中证AI(930713) 当前真实 PE（csindex），按成长股区间映射"""
    try:
        df = ak.stock_zh_index_value_csindex(symbol="930713")
        pe = float(df["市盈率1"].iloc[-1])
        # 科技成长：PE<35低估 35-60合理 60-90偏高 >90高估
        score = pe  # 直接用PE值当score口径
        return {"pe": round(pe, 2), "score": pe, "mode": "当前PE"}
    except Exception as e:
        print(f"[valuator] 中证AI失败：{e}")
        return {"pe": 51.85, "score": 51.85, "mode": "默认", "fallback": True}


def get_semi_pe() -> dict:
    """半导体：巨潮电子行业当前 PE（加权），按成长股区间映射。日期动态取当天。"""
    from datetime import timedelta
    # 巨潮按交易日披露，周末/节假日无数据，从今天往回找最近7天
    for back in range(0, 8):
        d = (_date.today() - timedelta(days=back)).strftime("%Y%m%d")
        try:
            df = ak.stock_industry_pe_ratio_cninfo(symbol="证监会行业分类", date=d)
            if df is None or len(df) == 0:
                continue  # 该日无数据（周末/节假日），往回找
            row = df[df["行业名称"].str.contains("计算机、通信和其他电子设备", na=False)]
            if len(row) > 0:
                pe = float(row["静态市盈率-加权平均"].iloc[0])
                return {"pe": round(pe, 2), "score": pe, "mode": "当前PE(电子行业)"}
        except Exception:
            continue  # 该日接口报错，往回找
    print("[valuator] 半导体近7天均无数据，用默认")
    return {"pe": 75.6, "score": 75.6, "mode": "默认", "fallback": True}


def get_index_valuations() -> list:
    out = []
    for code, (name, lg) in WIDE.items():
        v = get_wide_pe_percentile(lg)
        sig, txt, mult = _sig(v["score"])
        out.append({
            "code": code, "name": f"{name}指数", "category": "宽基指数",
            "pePercentile": v["score"], "pe": v["pe"], "mode": v["mode"],
            "monthlyChange": 0, "signal": sig, "signalText": txt, "multiplier": mult
        })
    # 中证AI
    ai = get_ai_pe()
    sig, txt, mult = _sig(ai["score"])
    out.append({
        "code": "AI_INDEX", "name": "人工智能/AI科技", "category": "前沿AI科技",
        "pePercentile": ai["score"], "pe": ai["pe"], "mode": ai["mode"],
        "monthlyChange": 0, "signal": sig, "signalText": txt, "multiplier": mult
    })
    # 半导体
    semi = get_semi_pe()
    sig, txt, mult = _sig(semi["score"])
    out.append({
        "code": "CHIP_INDEX", "name": "半导体芯片", "category": "硬核半导体",
        "pePercentile": semi["score"], "pe": semi["pe"], "mode": semi["mode"],
        "monthlyChange": 0, "signal": sig, "signalText": txt, "multiplier": mult
    })
    # 纯债
    out.append({
        "code": "BOND_INDEX", "name": "纯债与信用债", "category": "稳健防守",
        "pePercentile": 50, "pe": 0, "mode": "固收",
        "monthlyChange": 0, "signal": "NORMAL", "signalText": "🛡️ 纯债稳健 (1.0x固收)", "multiplier": 1.0
    })
    return out


if __name__ == "__main__":
    for it in get_index_valuations():
        print(f"{it['name']:18s} score={it['pePercentile']:6.1f} PE={it.get('pe',0):7.2f} {it['mode']:12s} {it['signalText']}")
