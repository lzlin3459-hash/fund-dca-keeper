"""
fund_nav.py — 基金真实净值拉取（akshare 天天基金）
替换知衡里 currentNav=1.0 的占位数据
"""
from __future__ import annotations
import akshare as ak

_cache = {}


def get_fund_nav(code: str) -> dict:
    """返回 {nav, daily_pct, month_ago_nav, month_change}。失败给默认。"""
    if code in _cache:
        return _cache[code]
    try:
        df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")
        df = df.dropna(subset=["单位净值"])
        df["单位净值"] = df["单位净值"].astype(float)
        nav = float(df["单位净值"].iloc[-1])
        daily_pct = float(df["日增长率"].iloc[-1]) if "日增长率" in df.columns else 0.0
        # 近一月涨跌（约20个交易日前）
        if len(df) >= 20:
            m_ago = float(df["单位净值"].iloc[-20])
            month_change = round((nav - m_ago) / m_ago * 100, 2)
        else:
            month_change = 0.0
        result = {"nav": round(nav, 4), "daily_pct": round(daily_pct, 2),
                  "month_change": month_change, "real": True}
    except Exception as e:
        print(f"[fund_nav] {code} 净值拉取失败：{e}")
        result = {"nav": 1.0, "daily_pct": 0.0, "month_change": 0.0, "real": False}
    _cache[code] = result
    return result


if __name__ == "__main__":
    for c in ["110020", "001052", "018846", "012733", "008887"]:
        print(c, get_fund_nav(c))
