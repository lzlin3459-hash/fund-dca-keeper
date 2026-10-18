"""
fund_nav.py — 基金真实净值拉取（akshare 天天基金）
替换知衡里 currentNav=1.0 的占位数据
"""
from __future__ import annotations
import akshare as ak

_cache = {}


def get_fund_nav(code: str) -> dict:
    """返回 {nav, daily_pct, month_ago_nav, month_change, 时间止损分析字段}。失败给默认。"""
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

        # ---- 净值自身历史高点（仅参考展示，不参与时间止损判断）----
        # 时间止损用成本口径（持仓时长 vs avgCost），在 webapp.py 计算
        nav_series = df["单位净值"].astype(float)
        high_nav = float(nav_series.max())
        high_idx = int(nav_series.idxmax())
        high_date = str(df["净值日期"].iloc[high_idx]) if "净值日期" in df.columns else ""
        from datetime import date as _date, datetime as _dt
        months_since_high = 0.0
        if high_date:
            try:
                hd = _dt.strptime(str(high_date)[:10], "%Y-%m-%d").date()
                months_since_high = round((_date.today() - hd).days / 30.44, 1)
            except Exception:
                months_since_high = 0.0
        drawdown = round((high_nav - nav) / high_nav * 100, 1) if high_nav > 0 else 0.0

        result = {
            "nav": round(nav, 4), "daily_pct": round(daily_pct, 2),
            "month_change": month_change, "real": True,
            "highNav": round(high_nav, 4),
            "highDate": high_date,
            "monthsSinceHigh": months_since_high,
            "drawdownPct": drawdown,
        }
    except Exception as e:
        print(f"[fund_nav] {code} 净值拉取失败：{e}")
        result = {"nav": 1.0, "daily_pct": 0.0, "month_change": 0.0, "real": False,
                  "highNav": 1.0, "highDate": "", "monthsSinceHigh": 0.0,
                  "drawdownPct": 0.0}
    _cache[code] = result
    return result


if __name__ == "__main__":
    for c in ["110020", "001052", "018846", "012733", "008887"]:
        print(c, get_fund_nav(c))
