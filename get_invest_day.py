# -*- coding: utf-8 -*-
"""
get_invest_day.py — 算出本月实际定投日（>=5号的第一个交易日，自动避开周末/节假日）
用法: python get_invest_day.py
输出: 本月实际定投日
"""
import akshare as ak
from datetime import date, datetime

today = date.today()
year, month = today.year, today.month

# 拉交易日历
df = ak.tool_trade_date_hist_sina()
df['trade_date'] = df['trade_date'].astype(str)
dates = df['trade_date'].tolist()

# 本月 >= 5号 的交易日
prefix = f"{year}-{month:02d}"
cands = [d for d in dates if d.startswith(prefix) and d[8:10] >= "05"]

if not cands:
    print(f"本月({year}-{month:02d})5号后无交易日，可能跨年")
    raise SystemExit

invest_day = min(cands)
inv_date = datetime.strptime(invest_day, "%Y-%m-%d").date()
weekdays = ["周一","周二","周三","周四","周五","周六","周日"]
wd = weekdays[inv_date.weekday()]
delta = (inv_date - today).days

# 5号是不是交易日？
day5 = f"{prefix}-05"
is_5_trade = day5 in dates

print(f"今天: {today} ({weekdays[today.weekday()]})")
print(f"目标定投日: {year}年{month}月5号")
print(f"5号是否交易日: {'是' if is_5_trade else '否（周末/节假日）'}")
print(f"实际定投日: {invest_day} ({wd})")
if delta == 0:
    print("→ 今天就是定投日，请立即打开工具刷新并执行")
elif delta == 1:
    print("→ 明天是定投日，请今晚打开工具刷新确定金额")
else:
    print(f"→ 定投日在{delta}天后，请在{invest_day}当天操作")
