"""
cycle_detector.py — 经济周期自动判断（美林时钟 + 基钦库存周期 + 朱格拉节点）

数据来源：akshare 免费宏观接口
判断逻辑：
  1. 美林时钟：GDP增速方向 + CPI方向 → 四象限（复苏/过热/滞胀/衰退）
  2. 基钦库存周期：PPI同比趋势 → 补库/去库阶段
  3. 朱格拉周期：硬编码关键节点（2028Q1见顶预警）

输出：按基金类型返回周期调节系数（叠加在估值乘数上）
"""
from __future__ import annotations
import akshare as ak
from datetime import date as _date

_cache = {}


def _latest_cpi_yoy() -> float:
    """最新CPI同比（%），失败返回None"""
    try:
        df = ak.macro_china_cpi()
        if df is None or len(df) == 0:
            return None
        return float(df.iloc[0]["全国-同比增长"])
    except Exception:
        return None


def _latest_ppi_yoy() -> float:
    """最新PPI同比（%），失败返回None"""
    try:
        df = ak.macro_china_ppi()
        if df is None or len(df) == 0:
            return None
        return float(df.iloc[0]["当月同比增长"])
    except Exception:
        return None


def _gdp_trend() -> str:
    """GDP增速方向：up/down（对比最近两期），失败返回up"""
    try:
        df = ak.macro_china_gdp()
        if df is None or len(df) < 2:
            return "up"
        cur = float(df.iloc[0]["国内生产总值-同比增长"])
        prev = float(df.iloc[1]["国内生产总值-同比增长"])
        return "up" if cur >= prev else "down"
    except Exception:
        return "up"


def _cpi_trend() -> str:
    """CPI方向：up/down（最近两期），失败返回up"""
    try:
        df = ak.macro_china_cpi()
        if df is None or len(df) < 2:
            return "up"
        cur = float(df.iloc[0]["全国-同比增长"])
        prev = float(df.iloc[1]["全国-同比增长"])
        return "up" if cur >= prev else "down"
    except Exception:
        return "up"


def get_merrill_clock_phase() -> dict:
    """美林时钟四象限判断"""
    growth = _gdp_trend()
    inflation = _cpi_trend()

    if growth == "up" and inflation == "down":
        return {"phase": "复苏", "text": "🌱 复苏期（股票最优）", "stock_mult": 1.1, "bond_mult": 0.9}
    elif growth == "up" and inflation == "up":
        return {"phase": "过热", "text": "🔥 过热期（商品最优）", "stock_mult": 1.0, "bond_mult": 0.9}
    elif growth == "down" and inflation == "up":
        return {"phase": "滞胀", "text": "⚠️ 滞胀期（现金/红利防御）", "stock_mult": 0.8, "bond_mult": 1.0}
    else:
        return {"phase": "衰退", "text": "❄️ 衰退期（债券最优）", "stock_mult": 0.9, "bond_mult": 1.1}


def get_kitchin_phase() -> dict:
    """基钦库存周期阶段（用PPI判断）"""
    ppi = _latest_ppi_yoy()
    if ppi < 0:
        return {"phase": "通缩去库", "text": "PPI负，通缩去库", "mult": 0.9}
    elif ppi < 3:
        return {"phase": "温和补库", "text": "PPI回升，主动补库初期", "mult": 1.05}
    elif ppi < 6:
        return {"phase": "加速补库", "text": "PPI加速，补库中期", "mult": 1.0}
    else:
        return {"phase": "过热补库", "text": "PPI过高，补库后期", "mult": 0.85}


def get_juglar_adjustment(now=None) -> dict:
    """朱格拉周期节点（硬编码关键拐点）"""
    now = now or _date.today()
    # 张忆东判断：2028Q1朱格拉见顶
    # 2026-2027：下半场初期（温和）
    # 2028Q1起：见顶预警（科技类收敛）
    if now.year < 2028:
        return {"phase": "朱格拉下半场", "text": "科技周期下半场（温和）", "tech_mult": 1.0}
    elif now.year == 2028 and now.month < 7:
        return {"phase": "朱格拉见顶预警", "text": "⚠️ 2028Q1见顶，科技收敛", "tech_mult": 0.8}
    else:
        return {"phase": "朱格拉出清期", "text": "科技出清，等待新周期", "tech_mult": 0.9}


def get_cycle_adjustment(fund_category: str) -> dict:
    """
    按基金类型返回周期调节系数
    fund_category: 宽基/红利/科技/纯债
    任何环节失败都返回中性1.0x，不影响定投主流程
    """
    try:
        if "cycle" in _cache:
            merrill, kitchin, juglar = _cache["cycle"]
        else:
            merrill = get_merrill_clock_phase()
            kitchin = get_kitchin_phase()
            juglar = get_juglar_adjustment()
            _cache["cycle"] = (merrill, kitchin, juglar)

        # 基础系数：按基金类型
        if "宽基" in fund_category or "大盘" in fund_category or "中盘" in fund_category:
            base = merrill["stock_mult"]
        elif "红利" in fund_category:
            # 滞胀期红利防御价值上升
            base = 1.1 if merrill["phase"] == "滞胀" else merrill["stock_mult"]
        elif "科技" in fund_category or "AI" in fund_category or "半导体" in fund_category or "芯片" in fund_category:
            base = juglar["tech_mult"]
        elif "纯债" in fund_category or "债" in fund_category:
            base = merrill["bond_mult"]
        else:
            base = 1.0

        # 基钦微调（±0.05），纯债不调
        if "债" not in fund_category:
            base = round(base * kitchin["mult"], 3)

        return {
            "merrill": merrill["phase"],
            "merrill_text": merrill["text"],
            "kitchin": kitchin["phase"],
            "kitchin_text": kitchin["text"],
            "juglar": juglar["phase"],
            "juglar_text": juglar["text"],
            "cycle_mult": base,
        }
    except Exception as e:
        # 周期判断失败，返回中性系数，不影响定投主流程
        print(f"[cycle] 周期判断失败，用中性1.0x: {e}")
        return {
            "merrill": "未知", "merrill_text": "周期数据获取失败",
            "kitchin": "未知", "kitchin_text": "周期数据获取失败",
            "juglar": "未知", "juglar_text": "周期数据获取失败",
            "cycle_mult": 1.0,
        }


if __name__ == "__main__":
    print("=== 周期判断（实时数据）===")
    m = get_merrill_clock_phase()
    k = get_kitchin_phase()
    j = get_juglar_adjustment()
    print(f"美林时钟: {m['text']}")
    print(f"基钦周期: {k['text']}")
    print(f"朱格拉:   {j['text']}")
    print()
    for cat in ["宽基", "红利", "科技", "纯债"]:
        adj = get_cycle_adjustment(cat)
        print(f"{cat}: 周期系数={adj['cycle_mult']}")
