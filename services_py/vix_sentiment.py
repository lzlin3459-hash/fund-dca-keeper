"""
vix_sentiment.py — VIX/VXN 市场情绪系数（逆向加仓）

数据来源：CBOE官方每日收盘CSV（历史数据，每日更新一次，对月度定投足够）
判断逻辑：
  1. VIX > 30：全球恐慌 → 全部权益类逆向加码 1.2x
  2. VXN > VIX 且 VXN > 25：科技被错杀 → 半导体/AI加码 1.15x
  3. VIX > VXN 且 VIX > 25：大盘恐慌科技抗跌 → 红利/宽基加码 1.1x
  4. VIX < 15：市场过度平静 → 科技类收敛 0.9x
  5. 正常区间：中性 1.0x
"""
from __future__ import annotations
import urllib.request
import csv
import io
from datetime import datetime

_cache = {}
_CACHE_TTL = 24 * 3600  # 24小时缓存（每日收盘数据，一天刷一次足够）


def _fetch_cboe(symbol: str) -> float:
    """从CBOE官方拉取最新收盘价，失败返回None"""
    url = f"https://cdn.cboe.com/api/global/us_indices/daily_prices/{symbol}_History.csv"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
        if not rows:
            return None
        latest = rows[-1]  # 最后一行是最新日期
        # 列名是大写的 CLOSE
        close = latest.get("CLOSE", "") or latest.get("Close", "")
        if close:
            return float(close)
        return None
    except Exception as e:
        print(f"[vix] CBOE拉取{symbol}失败: {e}")
        return None


def _get_vix_vxn() -> tuple[float, float]:
    """返回 (VIX, VXN)，失败都返回None"""
    now_ts = datetime.now().timestamp()
    if "vix" in _cache and (now_ts - _cache.get("ts", 0)) < _CACHE_TTL:
        return _cache["vix"]

    vix = _fetch_cboe("VIX")
    vxn = _fetch_cboe("VXN")

    # 只有两个都拉到才缓存
    if vix is not None and vxn is not None:
        _cache["vix"] = (vix, vxn)
        _cache["ts"] = now_ts
    return vix, vxn


def get_vix_sentiment(fund_category: str) -> dict:
    """
    按基金类型返回VIX/VXN情绪系数
    fund_category: 宽基/红利/科技/纯债
    """
    try:
        vix, vxn = _get_vix_vxn()

        # 数据获取失败，返回中性
        if vix is None or vxn is None:
            return {
                "vix": None, "vxn": None,
                "sentiment_mult": 1.0,
                "sentiment_text": "VIX数据获取失败，中性",
            }

        ratio = vix / vxn if vxn > 0 else 1.0

        # 基础系数
        if "纯债" in fund_category or "债" in fund_category:
            mult = 1.0  # VIX是股票恐慌，债券不调
            text = "VIX不影响债券"
        elif vix > 30 and vxn > 30:
            # 全球恐慌，全部权益加码
            mult = 1.2
            text = f"🌍 全球恐慌(VIX={vix:.0f},VXN={vxn:.0f})，逆向加码"
        elif vxn > vix and vxn > 25:
            # 科技恐慌 > 大盘恐慌，科技被错杀
            if "科技" in fund_category or "AI" in fund_category or "半导体" in fund_category or "芯片" in fund_category:
                mult = 1.15
                text = f"💻 科技恐慌(VXN={vxn:.0f}>VIX={vix:.0f})，科技逆向加码"
            else:
                mult = 1.0
                text = f"科技恐慌但非科技类，中性"
        elif vix > vxn and vix > 25:
            # 大盘恐慌 > 科技恐慌，科技抗跌
            if "红利" in fund_category or "宽基" in fund_category:
                mult = 1.1
                text = f"🛡️ 大盘恐慌(VIX={vix:.0f}>VXN={vxn:.0f})，红利/宽基加码"
            else:
                mult = 1.0
                text = f"大盘恐慌但非防御类，中性"
        elif vix < 15:
            # 市场过度平静，反向收敛（贪婪时减仓）
            if "科技" in fund_category or "AI" in fund_category or "半导体" in fund_category or "芯片" in fund_category:
                mult = 0.9
                text = f"😴 VIX={vix:.0f}过度平静，科技收敛"
            else:
                mult = 1.0
                text = f"VIX={vix:.0f}平静，中性"
        else:
            mult = 1.0
            text = f"VIX={vix:.0f},VXN={vxn:.0f}，正常区间"

        return {
            "vix": round(vix, 1),
            "vxn": round(vxn, 1),
            "ratio": round(ratio, 2),
            "sentiment_mult": mult,
            "sentiment_text": text,
        }
    except Exception as e:
        print(f"[vix] 情绪判断失败，中性: {e}")
        return {
            "vix": None, "vxn": None,
            "sentiment_mult": 1.0,
            "sentiment_text": "VIX判断异常，中性",
        }


if __name__ == "__main__":
    print("=== VIX/VXN 情绪判断（CBOE官方数据）===")
    for cat in ["纯债", "宽基", "红利", "科技", "半导体", "AI"]:
        r = get_vix_sentiment(cat)
        print(f"{cat:8s} VIX={r['vix']} VXN={r.get('vxn','N/A')} 系数={r['sentiment_mult']:.2f}  {r['sentiment_text']}")
