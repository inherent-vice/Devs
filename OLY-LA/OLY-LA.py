# -*- coding: utf-8 -*-
"""
olympic_lane_auto.py

KSPO 수영장 레인대여 자동 신청 매크로 (Playwright / Python, Persistent Profile)

────────────────────────────────────────────────────────────────────────────
■ 필수 사전 준비
- pip install playwright && playwright install chromium
- (선택) 로그인 자동화를 위한 환경변수:
  - OLYM_ID, OLYM_PW

■ 주요 특징
- 지속 프로필(user data dir) 사용: pw_userdata/ (쿠키/세션 유지)
- 페이지 내 전역 JS 함수 직접 활용:
  - fn_swimming_time_list(YYYYMMDD)
  - fn_swimming_court_img2_setting()
  - fn_swimming_basket()  (선택한 시간/레인을 바구니로)
  - fn_swimming_basket_list() (합계/상태 확인)
- HTML 구조 기반 안정 셀렉터:
  - 시간 리스트: #time_con li / label, hidden inputs (#start_t_#, #end_t_#)
  - 날짜확정 버튼: #date_confirm
  - 레인 리스트: #swim_lane a#swimming_court_img_a_2_{lane}
  - 레인확정 버튼: #lane_confirm
  - 결제/신청정보 박스: #aplictn_info .txt_total > strong
- 안전 로그/대기: [OLY-LANE HH:MM:SS] 프리픽스, 알럿 자동 승인, 네트워크 대기

■ 사용 예시 (Repository Guidelines와 동일)
- GUI 프롬프트:         python olympic_lane_auto.py --gui
- 헤드리스 실행:         python olympic_lane_auto.py --date 20250811 --times 09:00 10:00 --lanes 1 3 --headless
- 오픈 감시(비침투):      python olympic_lane_auto.py --watch-openings --date 20250811 --times 10:00 --lanes 1
- 달력 스캔:            python olympic_lane_auto.py --scan-dates --scan-max-dates 30 --times 10:00 11:00
- 화면 모드:            --view-mode date|court (기본: date)
- 정각 발사:            --fire_at 00:42:25  (KST 기준; 오늘 날짜에 해당 시각 도달 시 자동 시작)

■ 주의
- 사이트 약관/정책을 준수하십시오.
- 매일 23:50~00:10 사이에는 온라인 작업이 제한될 수 있습니다(사이트 공지 반영).
────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import os
import re
import sys
import json
import time
import argparse
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict

from playwright.sync_api import (
    sync_playwright,
    Page,
    BrowserContext,
    TimeoutError as PWTimeoutError,
    Error as PWError,
)

# ────────────────────────────────────────────────────────────────────────────
# 설정 상수
# ────────────────────────────────────────────────────────────────────────────

KST_OFFSET = 9  # Asia/Seoul
BASE_URL = "https://www.ksponco.or.kr/online/swimming/resrvtn_aplictn.do"
INDEX_URL = "https://www.ksponco.or.kr/online/swimming/index.do"
SSO_LOGIN_URL = "https://www.ksponco.or.kr/SSOService.do?req_returnUrl=" + INDEX_URL

USER_DATA_DIR = str(Path(__file__).parent.joinpath("pw_userdata").resolve())

LOG_PREFIX = "[OLY-LANE {ts}]"

# 사이트가 매일 23:50~00:10까지 온라인 작업 제한(공지 반영)
DAILY_BLOCK_START = (23, 50, 0)
DAILY_BLOCK_END = (0, 10, 0)


# ────────────────────────────────────────────────────────────────────────────
# 유틸리티
# ────────────────────────────────────────────────────────────────────────────

def kst_now() -> datetime:
    """KST 기준 현재 시각 반환."""
    return datetime.utcnow() + timedelta(hours=KST_OFFSET)


def log(msg: str) -> None:
    ts = kst_now().strftime("%H:%M:%S")
    print(LOG_PREFIX.format(ts=ts), msg)


def parse_date_yyyymmdd(s: str) -> str:
    """YYYYMMDD 정규화(숫자만 남김)."""
    digits = re.sub(r"[^\d]", "", s)
    if len(digits) != 8:
        raise ValueError(f"날짜 형식 오류: {s} (예: 20250907)")
    return digits


def parse_time_hhmm(s: str) -> str:
    """HH:MM 정규화."""
    m = re.match(r"^(\d{1,2}):(\d{2})$", s.strip())
    if not m:
        raise ValueError(f"시간 형식 오류: {s} (예: 09:00)")
    hh = int(m.group(1))
    mm = int(m.group(2))
    if not (0 <= hh < 24 and mm in (0, 30, 59,)):
        # 분은 사이트가 :00 기준이나 여지를 둠
        pass
    return f"{hh:02d}:{mm:02d}"


def load_config_from_json(path: Path) -> Dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def within_daily_block(now: datetime) -> bool:
    """매일 23:50~00:10 제한 시간대 여부."""
    start = now.replace(hour=DAILY_BLOCK_START[0], minute=DAILY_BLOCK_START[1], second=DAILY_BLOCK_START[2], microsecond=0)
    # 00:10은 다음날
    end = (now + timedelta(days=1)).replace(hour=DAILY_BLOCK_END[0], minute=DAILY_BLOCK_END[1], second=DAILY_BLOCK_END[2], microsecond=0)
    if now >= start:
        return now < end
    # 00:00~00:10
    prev_start = (now - timedelta(days=1)).replace(hour=DAILY_BLOCK_START[0], minute=DAILY_BLOCK_START[1], second=DAILY_BLOCK_START[2], microsecond=0)
    return now < end and now >= prev_start


# ────────────────────────────────────────────────────────────────────────────
# Tkinter GUI (필수값 입력 창) - 체크박스 버전
# ────────────────────────────────────────────────────────────────────────────
def gui_collect_params(defaults: dict) -> dict:
    """
    체크박스 GUI:
      - 시간: 09:00~15:00 (체크박스)
      - 레인: 1~5 (체크박스)
      - 예약 날짜: 기본 = KST 오늘+6일 (YYYYMMDD)
      - 발사시각: 기본 = GUI를 띄운 시각 (HH:MM:SS)

    반환:
    {
      "date": "YYYYMMDD",
      "times": ["09:00","10:00",...],
      "lanes": [1,2,...],
      "headless": bool,
      "view_mode": "date" | "court",
      "fire_at": "HH:MM:SS" | "",
      "direct_pay": bool,
      "watch_openings": bool,
      "scan_dates": bool,
      "scan_max_dates": int,
    }
    """
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
    except Exception:
        # Tkinter 불가 → 콘솔 폴백
        log("Tkinter를 사용할 수 없어 콘솔 프롬프트로 대체합니다.")
        date_default = (kst_now() + timedelta(days=6)).strftime("%Y%m%d")
        date_str = input(f"예약 날짜(YYYYMMDD) [{defaults.get('date', date_default)}]: ").strip() or defaults.get("date", date_default)
        times_str = input("시작시각들(공백구분, 예: 09:00 10:00): ").strip()
        lanes_str = input("레인들(공백구분, 예: 1 2 3 4 5): ").strip()
        return {
            "date": date_str,
            "times": times_str.split() if times_str else [],
            "lanes": [int(x) for x in lanes_str.split()] if lanes_str else [],
            "headless": bool(defaults.get("headless", False)),
            "view_mode": defaults.get("view_mode", "date"),
            "fire_at": (defaults.get("fire_at") or kst_now().strftime("%H:%M:%S")),
            "direct_pay": False,
            "watch_openings": False,
            "scan_dates": False,
            "scan_max_dates": int(defaults.get("scan_max_dates", 30)),
        }

    # 기본값 계산
    default_date = defaults.get("date") or (kst_now() + timedelta(days=6)).strftime("%Y%m%d")
    default_fire = defaults.get("fire_at") or kst_now().strftime("%H:%M:%S")

    # 체크 박스 후보
    time_slots = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00"]
    lane_slots = [1, 2, 3, 4, 5]

    root = tk.Tk()
    root.title("KSPO 레인 자동신청 - GUI")
    root.resizable(False, False)

    pad = {"padx": 8, "pady": 6}

    # 변수 준비
    v_date = tk.StringVar(value=default_date)
    v_headless = tk.BooleanVar(value=bool(defaults.get("headless", False)))
    v_view = tk.StringVar(value=defaults.get("view_mode", "date"))
    v_fire = tk.StringVar(value=default_fire)
    v_direct = tk.BooleanVar(value=False)
    v_watch = tk.BooleanVar(value=False)
    v_scan = tk.BooleanVar(value=False)
    v_scan_max = tk.IntVar(value=int(defaults.get("scan_max_dates", 30)))
    v_mock = tk.BooleanVar(value=bool(defaults.get("mock_available", False)))

    # 시간/레인 체크박스 변수 dict
    v_times: dict[str, tk.BooleanVar] = {t: tk.BooleanVar(value=False) for t in time_slots}
    v_lanes: dict[int, tk.BooleanVar] = {n: tk.BooleanVar(value=False) for n in lane_slots}

    frame = ttk.Frame(root)
    frame.pack(fill="both", expand=True, **pad)

    # 예약 날짜
    ttk.Label(frame, text="예약 날짜 (YYYYMMDD)").grid(row=0, column=0, sticky="w", **pad)
    ttk.Entry(frame, textvariable=v_date, width=20).grid(row=0, column=1, **pad)

    # 시간 체크박스
    ttk.Label(frame, text="시작시각(체크)").grid(row=1, column=0, sticky="nw", **pad)
    times_frame = ttk.Frame(frame); times_frame.grid(row=1, column=1, sticky="w", **pad)
    # 7개를 보기 좋게 4+3 배치
    for idx, t in enumerate(time_slots):
        cb = ttk.Checkbutton(times_frame, text=f"{t[:2]}시", variable=v_times[t])
        cb.grid(row=idx // 4, column=idx % 4, sticky="w", padx=4, pady=2)

    # 레인 체크박스
    ttk.Label(frame, text="레인(체크)").grid(row=2, column=0, sticky="w", **pad)
    lanes_frame = ttk.Frame(frame); lanes_frame.grid(row=2, column=1, sticky="w", **pad)
    for idx, n in enumerate(lane_slots):
        cb = ttk.Checkbutton(lanes_frame, text=f"{n} 레인", variable=v_lanes[n])
        cb.grid(row=0, column=idx, sticky="w", padx=6, pady=2)

    # 화면 모드
    ttk.Label(frame, text="화면 모드").grid(row=3, column=0, sticky="w", **pad)
    ttk.OptionMenu(frame, v_view, v_view.get(), "date", "court").grid(row=3, column=1, sticky="w", **pad)

    # 발사시각
    ttk.Label(frame, text="발사시각 (HH:MM:SS, 옵션)").grid(row=4, column=0, sticky="w", **pad)
    ttk.Entry(frame, textvariable=v_fire, width=20).grid(row=4, column=1, sticky="w", **pad)

    # 실행 옵션
    opts1 = ttk.Frame(frame); opts1.grid(row=5, column=0, columnspan=2, sticky="w", **pad)
    ttk.Checkbutton(opts1, text="헤드리스", variable=v_headless).grid(row=0, column=0, sticky="w", padx=4)
    ttk.Checkbutton(opts1, text="바로결제까지", variable=v_direct).grid(row=0, column=1, sticky="w", padx=12)
    ttk.Checkbutton(opts1, text="가용 감시(비침투)", variable=v_watch).grid(row=0, column=2, sticky="w", padx=12)
    ttk.Checkbutton(opts1, text="주말 스캔(비침투)", variable=v_scan).grid(row=0, column=3, sticky="w", padx=12)
    ttk.Checkbutton(opts1, text="테스트 모드(모의 응답)", variable=v_mock).grid(row=0, column=4, sticky="w", padx=12)

    # 스캔 일수
    ttk.Label(frame, text="스캔 일수 (기본 30)").grid(row=6, column=0, sticky="w", **pad)
    ttk.Entry(frame, textvariable=v_scan_max, width=10).grid(row=6, column=1, sticky="w", **pad)

    result: dict = {}

    def on_start():
        date = v_date.get().strip()

        # 체크된 시간/레인 수집
        times_list = [t for t, var in v_times.items() if var.get()]
        # 정렬 보장(혹시 UI 재배열 시에도 안전)
        times_list.sort()

        lanes_list = [n for n, var in v_lanes.items() if var.get()]
        lanes_list.sort()

        # 모드별 유효성
        if v_watch.get() or v_scan.get():
            if not date or not times_list:
                messagebox.showerror("입력 오류", "감시/스캔 모드에서는 날짜와 시간은 필수입니다.")
                return
        else:
            if not date or not times_list or not lanes_list:
                messagebox.showerror("입력 오류", "날짜, 시간(체크), 레인(체크)은 필수입니다.")
                return

        result.update({
            "date": date,
            "times": times_list,
            "lanes": lanes_list,
            "headless": bool(v_headless.get()),
            "view_mode": v_view.get(),
            "fire_at": v_fire.get().strip(),
            "direct_pay": False if v_mock.get() else bool(v_direct.get()),
            "watch_openings": bool(v_watch.get()),
            "scan_dates": bool(v_scan.get()),
            "scan_max_dates": int(v_scan_max.get() or 30),
            "mock_available": bool(v_mock.get()),
        })
        root.destroy()

    ttk.Button(frame, text="시작", command=on_start).grid(row=7, column=0, columnspan=2, sticky="ew", **pad)

    # Enter 키로 시작
    root.bind("<Return>", lambda *_: on_start())

    # 창 중앙 배치(조금 보기 좋게)
    root.update_idletasks()
    w, h = root.winfo_width(), root.winfo_height()
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    x = int((sw - w) / 2); y = int((sh - h) / 2)
    root.geometry(f"+{x}+{y}")

    root.mainloop()
    return result


# ────────────────────────────────────────────────────────────────────────────
# Playwright 컨텍스트/로그인
# ────────────────────────────────────────────────────────────────────────────

def is_logged_in(page: Page) -> bool:
    try:
        return page.locator("a.logout").first.is_visible()
    except Exception:
        return False

def launch_context(headless: bool) -> BrowserContext:
    """지속 프로필을 사용하는 Chromium 컨텍스트 생성."""
    from playwright.sync_api import sync_playwright
    # persistent context 를 사용하면 browser 대신 context를 바로 얻음
    # headless가 True여도 persistent는 지원됨
    log(f"브라우저 실행: headless={headless}, user_data_dir={USER_DATA_DIR}")
    pw = sync_playwright().start()
    chromium = pw.chromium
    context = chromium.launch_persistent_context(
        USER_DATA_DIR,
        headless=headless,
        args=["--disable-blink-features=AutomationControlled"],
        viewport={"width": 1400, "height": 900},
        locale="ko-KR",
    )
    # 불필요 리소스 일부 차단(폰트/애널리틱스): 페이지 로딩 잡음 감소
    try:
        def _block_some(route, request):
            u = request.url or ""
            rtype = request.resource_type or ""
            if rtype in ("font",) or ("analytics" in u) or ("googletagmanager" in u):
                return route.abort()
            # 다른 라우트(예: mock)가 이어서 처리할 수 있도록 fallback 지원
            try:
                return route.fallback()
            except Exception:
                return route.continue_()
        context.route("**/*", _block_some)
    except Exception:
        pass
    # 알럿 자동 승인 및 로드 이벤트 로깅
    def _on_dialog(dialog):
        msg = dialog.message or ""
        log(f"알럿 감지: {msg!r}")
        # 장바구니 이동 유도 팝업은 현재 페이지에 머물기 위해 취소(dismiss)
        if ("결제바구니" in msg and "이동" in msg) or ("바구니로 이동" in msg):
            try:
                dialog.dismiss()
            finally:
                log("알럿 처리: 장바구니 이동 제안 → 취소(dismiss)")
        else:
            try:
                dialog.accept()
            finally:
                log("알럿 처리: 일반 알럿 → 확인(accept)")
    def _attach_page_events(p):
        p.on("dialog", _on_dialog)
        try:
            p.on("domcontentloaded", lambda: log(f"DOM Content Loaded: {p.url}"))
            p.on("load", lambda: log(f"Load: {p.url}"))
        except Exception:
            pass
    for page in context.pages:
        _attach_page_events(page)
    context.on("page", _attach_page_events)
    return context


def ensure_logged_in(page: Page, olym_id: Optional[str], olym_pw: Optional[str]) -> None:
    """
    로그인 상태가 아니면 SSO 페이지로 이동하여 로그인 시도.
    - Header에 '로그아웃' 링크(a.logout) 있으면 로그인 상태로 판단.
    - 폼 셀렉터는 불확정이므로 느슨한 방식으로 탐색:
      (type=text or name*id), (type=password), (type=submit or button[text~=로그인])
    - 세션 유지: pw_userdata/를 통해 이후 자동 로그인
    """
    page.goto(INDEX_URL, wait_until="domcontentloaded")
    # 로그인 여부 체크
    try:
        if page.locator("a.logout").first.is_visible():
            log("로그인 상태 확인: OK")
            return
    except PWTimeoutError:
        pass
    log("로그인 필요: SSO 페이지로 이동")
    page.goto(SSO_LOGIN_URL, wait_until="domcontentloaded")

    if olym_id and olym_pw:
        # 입력 폼 찾기 (여러 케이스 대비)
        # 1) ID
        candidates_id = [
            "input[name='loginId']",
            "input#loginId",
            "input[name='userId']",
            "input#userId",
            "input[type='text']",
        ]
        id_box = None
        for sel in candidates_id:
            loc = page.locator(sel)
            if loc.count() > 0:
                id_box = loc.first
                break
        # 2) PW
        candidates_pw = [
            "input[name='pswd']",
            "input#pswd",
            "input[name='userPwd']",
            "input#userPwd",
            "input[type='password']",
        ]
        pw_box = None
        for sel in candidates_pw:
            loc = page.locator(sel)
            if loc.count() > 0:
                pw_box = loc.first
                break

        if not id_box or not pw_box:
            log("경고: 로그인 입력창을 찾지 못했습니다. 수동 로그인 후 자동 진행됩니다.")
            return

        id_box.fill(olym_id)
        pw_box.fill(olym_pw)

        # 3) 제출 버튼
        candidates_btn = [
            "button[type='submit']",
            "input[type='submit']",
            "button:has-text('로그인')",
            "a:has-text('로그인')",
        ]
        clicked = False
        for sel in candidates_btn:
            loc = page.locator(sel)
            if loc.count() > 0 and loc.first.is_enabled():
                loc.first.click()
                clicked = True
                break
        if not clicked:
            # 폼 submit 시도
            pw_box.press("Enter")

        page.wait_for_load_state("domcontentloaded")

        # 재확인
        page.goto(INDEX_URL, wait_until="domcontentloaded")
        try:
            if page.locator("a.logout").first.is_visible():
                log("로그인 완료")
            else:
                log("경고: 로그인 확인 불가(헤더 탐지 실패). 세션 상태로 계속 진행합니다.")
        except PWTimeoutError:
            log("경고: 로그인 확인 중 타임아웃. 계속 진행합니다.")
    else:
        # 수동 로그인은 별도 준비 다이얼로그에서 확인하므로 여기서는 추가 이동/입력 없음
        log("환경변수 미설정: 브라우저에서 수동 로그인하세요. (잠시 후 '준비 완료' 창이 뜹니다)")
        return


def wait_user_ready_and_login(page: Page) -> None:
    """사용자가 수동 로그인 완료 후 '준비 완료'를 누를 때까지 대기. 로그인 미완료면 재요청."""
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
    except Exception:
        # GUI 불가 환경: 콘솔 폴백
        input("브라우저에서 로그인 완료 후 Enter ⏎ : ")
        return

    root = tk.Tk()
    root.title("로그인 준비")
    root.resizable(False, False)

    msg = ("브라우저가 열렸습니다.\n"
           "브라우저에서 로그인(우상단 ‘로그아웃’ 표시 확인) 후\n"
           "아래 '준비 완료' 버튼을 누르세요.")
    ttk.Label(root, text=msg, justify="left").pack(padx=16, pady=12)
    status = ttk.Label(root, text="상태: 대기 중"); status.pack(padx=16, pady=(0,8))

    def on_ready():
        nonlocal status
        status.config(text="상태: 확인 중…")
        root.update_idletasks()
        # SSO 리다이렉트 잔여 네비게이션이 있어도 에러 없이 시도
        try:
            if not is_logged_in(page):
                page.goto(INDEX_URL, wait_until="domcontentloaded")
        except Exception:
            pass
        if is_logged_in(page):
            root.destroy()
        else:
            messagebox.showerror("로그인 필요", "아직 로그인 상태가 아닙니다.\n로그인 완료 후 다시 눌러주세요.")
            status.config(text="상태: 로그인 미확인")

    ttk.Button(root, text="준비 완료", command=on_ready).pack(padx=16, pady=10, fill="x")
    root.update_idletasks()
    # 중앙 배치
    w, h = root.winfo_width(), root.winfo_height()
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    root.geometry(f"+{(sw-w)//2}+{(sh-h)//2}")
    root.mainloop()


# ────────────────────────────────────────────────────────────────────────────
# KSPO 레인 예약 동작
# ────────────────────────────────────────────────────────────────────────────

def goto_reservation(page: Page) -> None:
    """예약신청 페이지로 이동."""
    # 캐시를 매번 무효화하지 않고 기본 경로로 접근(초기 로딩 가속)
    page.goto(BASE_URL, wait_until="domcontentloaded")
    log("이동: 예약신청 페이지 로딩")


def set_view_mode(page: Page, mode: str = "date") -> None:
    """
    예약방법선택: 날짜별(date) / 레인별(court)
    HTML상 라디오:
      - #appType01 (날짜별), #appType02 (레인별)
    """
    if mode not in ("date", "court"):
        mode = "date"

    if mode == "date":
        page.locator("#appType01").check()
        log("모드 확인: 날짜별 선택 (#appType01)")
    else:
        page.locator("#appType02").check()
        log("모드 확인: 레인별 선택 (#appType02)")

    # 토글 이후 내부 스위칭 반영 대기
    time.sleep(0.3)


def exec_js_time_list(page: Page, yyyymmdd: str) -> None:
    """
    날짜별 모드에서 특정 일자의 시간목록을 불러오기 위해
    페이지 전역 함수 fn_swimming_time_list 호출.
    - 리로드/네비게이션 중 충돌을 피하기 위해 로드상태/함수존재 확인 후 최대 3회 재시도
    """
    log(f"시간목록 요청: fn_swimming_time_list('{yyyymmdd}') 호출")
    for attempt in range(3):
        try:
            # DOM 준비 대기 후 함수 존재 확인
            try:
                page.wait_for_load_state("domcontentloaded", timeout=10_000)
            except Exception:
                pass
            page.wait_for_function(
                "() => typeof window.fn_swimming_time_list === 'function'",
                timeout=5_000,
            )
            page.evaluate("(d) => window.fn_swimming_time_list(d)", yyyymmdd)
            # 시간 목록 렌더링 대기 (라벨까지 확인)
            page.wait_for_selector("#time_con li label", state="visible", timeout=10_000)
            return
        except PWError as e:
            msg = str(e)
            if ("Execution context was destroyed" in msg) or ("Target closed" in msg):
                log("페이지 리로드/네비 중 감지 → 재시도")
                continue
            raise


def _list_available_times(page: Page) -> List[str]:
    """#time_con에서 '신청가능'이고 체크박스 enabled인 시작시각 목록(HH:MM)"""
    avail: List[str] = []
    items = page.locator("#time_con li")
    for i in range(items.count()):
        li = items.nth(i)
        try:
            status = (li.locator(".label").inner_text() or "")
        except Exception:
            status = ""
        cb = li.locator("input[type=checkbox]").first
        if cb.count() == 0:
            continue
        # disabled 선제 차단
        if ("신청가능" in status) and cb.is_enabled() and (cb.get_attribute("disabled") is None):
            label_text = li.locator("label").inner_text()
            m = re.search(r"(\d{2}:\d{2})\s*~", label_text)
            if m:
                avail.append(m.group(1))
    return avail


def wait_until_openable(page: Page, date_str: str, want_times: List[str], timeout_sec: int = 600, poll_ms: int = 200) -> bool:
    """원하는 시간 중 하나라도 '신청가능+enabled'가 될 때까지 폴링"""
    deadline = time.time() + timeout_sec
    want = set(want_times)
    while time.time() < deadline:
        try:
            exec_js_time_list(page, date_str)  # 최신화
        except Exception:
            pass
        avail = set(_list_available_times(page))
        inter = sorted(want & avail)
        if inter:
            log(f"가용 감지: {inter}")
            return True
        time.sleep(poll_ms / 1000.0)
    return False


def select_times(page: Page, times: List[str], date_str: str) -> None:
    """원하는 시간들을 한 번에 체크하고 확정.
    - '신청가능'이며 체크박스 enabled인 항목만 체크
    - JS로 벌크 체크하여 재요청/재시도를 최소화
    """
    if page.locator("#time_con li").count() == 0:
        exec_js_time_list(page, date_str)

    # 입력 포맷 정규화
    want_times = [parse_time_hhmm(t) for t in times]

    # JS로 한 번에 체크(상태/disabled 확인 포함)
    try:
        ok_times = page.evaluate(
            """
            (wantTimes) => {
              const lis = Array.from(document.querySelectorAll('#time_con li'));
              const ok = [];
              for (const t of wantTimes) {
                const li = lis.find(el => el.textContent.includes(t));
                if (!li) continue;
                const cb = li.querySelector('input[type=checkbox]');
                const statusEl = li.querySelector('.label');
                const status = statusEl ? statusEl.textContent : '';
                if (cb && !cb.disabled && /신청가능/.test(status)) {
                  if (!cb.checked) cb.checked = true;
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                  if (cb.checked) ok.push(t);
                }
              }
              return ok;
            }
            """,
            want_times,
        )
    except Exception:
        ok_times = []

    if not ok_times:
        raise RuntimeError("선택 가능한 시간이 없습니다.")

    # 날짜확정 클릭 → 레인상태 응답 대기
    try:
        with page.expect_response(lambda r: "swimming_court_state.do" in r.url, timeout=10_000) as resp_wait:
            page.locator("#date_confirm").click()
        r = resp_wait.value
        log(f"레인상태 응답: {r.status} {r.url}")
    except Exception as e:
        log(f"경고: 레인상태 응답 대기 실패({e}); 버튼 클릭만 수행")
        page.locator("#date_confirm").click()

    # 전역 함수로 레인 패널 초기화/노출 트리거
    try:
        page.evaluate(
            """
            () => {
              if (typeof window.fn_swimming_court_img2_setting === 'function') {
                try { window.fn_swimming_court_img2_setting(); } catch (e) {}
              }
            }
            """
        )
    except Exception:
        pass

    # 실제 표시 상태 확인 (ComputedStyle 기반)
    page.wait_for_function(
        """
        () => {
          const ul = document.querySelector('#swim_lane .lane_list');
          if (!ul) return false;
          const cs = getComputedStyle(ul);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && ul.offsetParent !== null;
        }
        """,
        timeout=10_000,
    )
    log("시간 확인: 레인목록 표시됨")


def select_lanes(page: Page, lanes: List[int]) -> None:
    """
    레인 선택: 전역 함수(fn_swimming_lane_selected)를 직접 호출하여 벌크 선택 후 확인.
    - anchor 클릭 대비 UI 변동에 덜 민감
    - 실패 시 앵커 클릭 방식으로 폴백
    """
    # 레인 그리드가 실제로 보이는지 재확인(안전망)
    try:
        page.wait_for_function(
            """
            () => {
              const ul = document.querySelector('#swim_lane .lane_list');
              if (!ul) return false;
              const cs = getComputedStyle(ul);
              return cs.display !== 'none' && cs.visibility !== 'hidden' && ul.offsetParent !== null;
            }
            """,
            timeout=5_000,
        )
    except Exception:
        pass

    # 1) JS 벌크 호출 시도
    bulk_ok = False
    try:
        page.evaluate(
            """
            (lanes) => {
              if (typeof window.fn_swimming_lane_selected === 'function') {
                lanes.forEach(ln => {
                  try { window.fn_swimming_lane_selected('2', ln); } catch (e) {}
                });
              } else {
                throw new Error('fn_swimming_lane_selected not found');
              }
            }
            """,
            lanes,
        )
        bulk_ok = True
    except Exception:
        bulk_ok = False

    # 2) 폴백: 앵커 클릭
    if not bulk_ok:
        for lane in lanes:
            sel = f"#swimming_court_img_a_2_{lane}"
            link = page.locator(sel).first
            if link.count() == 0:
                log(f"경고: 레인 {lane} 선택 링크가 보이지 않습니다. (건너뜀)")
                continue
            try:
                try:
                    link.scroll_into_view_if_needed()
                except Exception:
                    pass
                if not link.is_visible():
                    link.click(force=True)
                else:
                    link.click()
                log(f"레인 선택: {lane}레인")
            except Exception as e:
                log(f"레인 {lane} 클릭 실패: {e} → force 재시도")
                link.click(force=True)

    # 선택 후 '확인' 버튼 → fn_swimming_basket() 호출(바구니 이동)
    try:
        with page.expect_response(lambda r: "swimming_basket_ins.do" in r.url, timeout=10_000) as resp_wait:
            page.locator("#lane_confirm").click()
        r = resp_wait.value
        log(f"레인 확인: 장바구니담기 응답 {r.status} {r.url}")
    except Exception as e:
        log(f"경고: 장바구니담기 응답 대기 실패({e}); 버튼 클릭만 수행")
        page.locator("#lane_confirm").click()
    log("레인 확인: #lane_confirm 클릭 (바구니 이동 시도)")

    # 결제/신청정보 박스 업데이트 대기 + 리스트 갱신 확인
    try:
        with page.expect_response(lambda r: "swimming_mbasket_list.do" in r.url, timeout=10_000):
            _refresh_basket_via_js(page)
    except Exception:
        _refresh_basket_via_js(page)


def _refresh_basket_via_js(page: Page) -> None:
    """바구니/합계 반영 상태 확인용 JS 호출."""
    try:
        page.evaluate("() => window.fn_swimming_basket_list()")
    except Exception:
        pass

def empty_basket_if_any(page: Page) -> None:
    """기존 바구니 항목이 있으면 가능한 경우 전체 삭제를 시도.
    - 버튼/함수 존재 여부는 페이지마다 다르므로 발견 시에만 실행
    """
    try:
        page.evaluate("() => window.fn_swimming_basket_list && window.fn_swimming_basket_list()")
    except Exception:
        pass

    btn = page.locator("#basket_del_all, button:has-text('전체삭제'), button:has-text('비우기')")
    try:
        if btn.count() > 0 and btn.first.is_enabled():
            log("기존 바구니 항목 감지 → 전체 삭제 시도")
            try:
                btn.first.click()
            except Exception:
                btn.first.click(force=True)
            try:
                page.evaluate("() => window.fn_swimming_basket_list && window.fn_swimming_basket_list()")
            except Exception:
                pass
        else:
            # 버튼이 없더라도 하나 이상의 항목 텍스트가 보이면 사용자에게 알림
            items = page.locator("#aplictn_info, #basket_list, .basket_list, table:has-text('결제')")
            if items.count() > 0:
                log("참고: 기존 바구니 항목이 남아 있을 수 있습니다.")
    except Exception:
        pass


def get_basket_total(page: Page) -> Optional[str]:
    """
    결제/신청정보 합계 텍스트 읽기.
    - 셀렉터: #aplictn_info .txt_total strong -> "100,000원"
    """
    total = page.locator("#aplictn_info .txt_total strong")
    if total.count() == 0:
        return None
    return total.first.inner_text().strip()


def click_direct_payment(page: Page) -> None:
    """
    '바로결제' 버튼 클릭 → 약관동의/결제 페이지로 이동.
    - 셀렉터: #direct_payment
    """
    btn = page.locator("#direct_payment")
    if btn.count() == 0 or not btn.first.is_enabled():
        log("경고: 바로결제 버튼이 비활성화되어 있습니다.")
        return
    btn.first.click()
    log("바로결제 버튼 클릭")


# ────────────────────────────────────────────────────────────────────────────
# 감시/스캔(비침투)
# ────────────────────────────────────────────────────────────────────────────

def watch_openings(page: Page, date_str: str, times: List[str], lanes: List[int], interval_sec: int = 5) -> None:
    """
    비침투 모드: 주어진 날짜/시간/레인에 '신청가능' 슬롯이 있는지 주기적으로 확인.
    실제 바구니/결제 동작은 수행하지 않음.
    """
    set_view_mode(page, "date")
    exec_js_time_list(page, date_str)

    want_times = set(parse_time_hhmm(t) for t in times)

    log(f"감시 시작: date={date_str}, times={sorted(want_times)}, lanes={lanes}, every {interval_sec}s")
    while True:
        # 최신 시간목록 갱신
        exec_js_time_list(page, date_str)

        # 각 시간 라인에서 '신청가능' 라벨이 붙은 것만 추림
        items = page.locator("#time_con li")
        avail = []
        for i in range(items.count()):
            li = items.nth(i)
            label_text = li.locator("label").inner_text()
            status = li.locator(".label").inner_text()  # "신청가능"|"신청마감"|...
            m = re.search(r"(\d{2}:\d{2})\s*~\s*(\d{2}:\d{2})", label_text)
            if not m:
                continue
            start = m.group(1)
            if (start in want_times) and ("신청가능" in status):
                avail.append(start)

        if avail:
            log(f"가용 발견: {avail} (시도하려면 일반 실행 모드로 돌리세요)")
            return
        else:
            log("가용 없음… 재확인 예정")

        time.sleep(interval_sec)


def scan_dates(page: Page, start_date: str, max_days: int, times: List[str]) -> None:
    """
    지정 시작일로부터 max_days 동안 주어진 시간대의 가능한 슬롯 존재 여부를 스캔.
    - 주말(토/일) 위주로 페이지 정책상 예약가능일이 많음.
    - 실제 바구니/결제 수행하지 않음.
    """
    set_view_mode(page, "date")
    tset = set(parse_time_hhmm(t) for t in times)

    dt = datetime.strptime(start_date, "%Y%m%d")
    log(f"스캔 시작: {start_date}부터 {max_days}일, 대상 시간={sorted(tset)}")

    for d in range(max_days):
        cur = dt + timedelta(days=d)
        ymd = cur.strftime("%Y%m%d")
        # 사이트 정책상 토/일/공휴일만 가용 → 토(5), 일(6) 우선
        if cur.weekday() not in (5, 6):
            continue

        try:
            exec_js_time_list(page, ymd)
        except PWTimeoutError:
            log(f"스캔 실패(시간목록 타임아웃): {ymd}")
            continue

        items = page.locator("#time_con li")
        day_avail = []
        for i in range(items.count()):
            li = items.nth(i)
            label_text = li.locator("label").inner_text()
            status = li.locator(".label").inner_text()
            m = re.search(r"(\d{2}:\d{2})\s*~\s*(\d{2}:\d{2})", label_text)
            if not m:
                continue
            start = m.group(1)
            if start in tset and ("신청가능" in status):
                day_avail.append(start)
    if day_avail:
        log(f"스캔 결과: {ymd} → 가능 {day_avail}")


# ────────────────────────────────────────────────────────────────────────────
# 테스트 모드: 모의(mock) 라우터
# ────────────────────────────────────────────────────────────────────────────
def install_mocks(context: BrowserContext, date_str: str, times: List[str], lanes: List[int]) -> None:
    import json as _json

    def _mtime(route, request):
        tlist = []
        for t in times:
            hh, mm = t.split(":")
            end_hh = f"{int(hh)+1:02d}"
            tlist.append({
                "startT": t, "endT": f"{end_hh}:{mm}",
                "endCnt": 0, "progCnt": 0, "myProgCnt": 0, "othersCnt": 0,
                "totCnt": 5, "uPrice": 100000
            })
        route.fulfill(status=200, body=_json.dumps({"ss_check": 1, "time_list": tlist}), content_type="application/json")

    def _court(route, request):
        lst = []
        lane_list = lanes or [1, 2, 3, 4, 5]
        for ln in lane_list:
            for _ in times:
                lst.append({"courtNo": ln, "useYn": "Y",
                            "endCnt": 0, "progCnt": 0, "myProgCnt": 0, "othersCnt": 0})
        route.fulfill(status=200, body=_json.dumps({"ss_check": 1, "swimming_court_list": lst}), content_type="application/json")

    def _basket_ins(route, request):
        route.fulfill(status=200, body=_json.dumps({"ss_check": 1, "validity_no": 0}), content_type="application/json")

    def _basket_list(route, request):
        items, amt = [], 0
        weekNm = "일"
        for idx, t in enumerate(times):
            end_hh = f"{int(t[:2])+1:02d}"
            lane_list = lanes or [1]
            for ln in lane_list:
                items.append({
                    "seqNo": f"{idx+1}{ln}",
                    "reserveDate": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}",
                    "weekNm": weekNm,
                    "courtNo": ln,
                    "startT": t,
                    "endT": f"{end_hh}:{t[3:]}",
                    "rcvAmt": 100000
                })
                amt += 100000
        route.fulfill(status=200, body=_json.dumps({
            "ss_check": 1, "reserve_m_seq": 1, "reserve_d_seq": 1, "swimming_basket_list": items
        }), content_type="application/json")

    context.route("**/swimming_mtime_list.do", _mtime)
    context.route("**/swimming_court_state.do", _court)
    context.route("**/swimming_basket_ins.do", _basket_ins)
    context.route("**/swimming_mbasket_list.do", _basket_list)

# ────────────────────────────────────────────────────────────────────────────
# 메인 플로우
# ────────────────────────────────────────────────────────────────────────────

def wait_until_fire_at(fire_at: Optional[str]) -> None:
    """
    --fire_at HH:MM:SS 옵션: KST 기준 당일 해당 시각까지 대기.
    """
    if not fire_at:
        return
    m = re.match(r"^(\d{2}):(\d{2}):(\d{2})$", fire_at.strip())
    if not m:
        log(f"--fire_at 형식 오류(무시): {fire_at}")
        return
    now = kst_now()
    target = now.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=int(m.group(3)), microsecond=0)
    if target <= now:
        # 내일 같은 시각
        target += timedelta(days=1)
    delta = (target - now).total_seconds()
    log(f"정각까지 대기(KST): {int(delta)}초 (목표 {target.strftime('%H:%M:%S')})")
    while delta > 0:
        # 마지막 구간 정밀도 향상(0.3s 이하는 50ms 단위)
        sleep = 0.05 if delta < 0.3 else (0.25 if delta < 2 else 1.0)
        if sleep > delta:
            sleep = delta
        time.sleep(sleep)
        delta = (target - kst_now()).total_seconds()
    log("발사시각 도달")


def hold_on_error(message: str, headless: bool) -> None:
    """오류 발생 시 자동 종료되지 않도록 대기.
    - 가능한 경우 간단한 Tk 창을 띄워 사용자가 닫을 때까지 유지
    - Tk 사용이 불가능하면 콘솔에서 Enter 대기
    """
    safe_msg = (
        "작업 중 오류가 발생했습니다.\n\n"
        f"{message}\n\n"
        "브라우저/화면을 확인한 뒤 이 창을 닫거나,\n"
        "콘솔에서는 Enter를 눌러 종료하세요."
    )
    try:
        import tkinter as tk
        from tkinter import ttk
    except Exception:
        try:
            input(safe_msg + "\n\n계속하려면 Enter ⏎ : ")
        except Exception:
            # 입력 대기가 불가한 환경이면 짧게 대기 후 반환
            time.sleep(5)
        return

    try:
        root = tk.Tk()
        root.title("오류 발생 - 종료 대기")
        root.resizable(False, False)

        lbl = ttk.Label(root, text=safe_msg, justify="left")
        lbl.pack(padx=16, pady=12)
        ttk.Button(root, text="닫고 종료", command=root.destroy).pack(padx=16, pady=(0, 12), fill="x")

        # 중앙 배치
        root.update_idletasks()
        w, h = root.winfo_width(), root.winfo_height()
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        root.geometry(f"+{(sw-w)//2}+{(sh-h)//2}")
        root.mainloop()
    except Exception:
        # GUI 표시 실패 시 콘솔 대기 폴백
        try:
            input(safe_msg + "\n\n계속하려면 Enter ⏎ : ")
        except Exception:
            time.sleep(5)


def prompt_browser_close(context, headless: bool) -> None:
    """장바구니 담기 후 사용자가 확인할 시간을 주고, '예'일 때만 브라우저 종료.
    - GUI가 가능하면 확인 다이얼로그/대기창 사용
    - GUI 불가면 콘솔 y/N 프롬프트로 폴백
    - headless면 즉시 종료
    """
    if headless:
        try:
            context.close()
        except Exception:
            pass
        return

    # GUI(권장) → 없으면 콘솔 폴백
    try:
        import tkinter as tk
        from tkinter import messagebox, ttk
    except Exception:
        try:
            ans = input("\n[완료] 브라우저를 지금 종료할까요? [y/N]: ").strip().lower()
        except KeyboardInterrupt:
            ans = "y"
        if ans in ("y", "yes"):
            try:
                context.close()
            except Exception:
                pass
            print("[OLY-LANE] 브라우저 종료")
            return
        print("[OLY-LANE] 브라우저를 계속 열어둡니다. 종료하려면 이 콘솔에서 Enter ⏎")
        try:
            input()
        except KeyboardInterrupt:
            pass
        try:
            context.close()
        except Exception:
            pass
        return

    # Tkinter UI
    root = tk.Tk()
    root.withdraw()
    if messagebox.askyesno("종료 확인", "장바구니 담기가 완료되었습니다.\n브라우저를 지금 종료할까요?"):
        try:
            context.close()
        except Exception:
            pass
        root.destroy()
        return

    # '아니오' → 작은 대기창 띄우고 프로세스를 살아 있게 유지
    win = tk.Toplevel()
    win.title("브라우저 확인 중")
    ttk.Label(win, text="결과를 확인하세요.\n종료하려면 아래 버튼을 누르세요.").pack(padx=16, pady=12)

    def _close_now():
        try:
            context.close()
        except Exception:
            pass
        win.destroy()
        root.destroy()

    ttk.Button(win, text="지금 종료", command=_close_now).pack(padx=16, pady=(0, 12))

    # 사용자가 크롬을 수동으로 닫아버린 경우 자동 종료
    def _poll_pages():
        try:
            if len(context.pages) == 0:
                _close_now()
                return
        except Exception:
            _close_now()
            return
        win.after(2000, _poll_pages)

    win.after(2000, _poll_pages)

    # 가운데 배치
    win.update_idletasks()
    sw, sh = win.winfo_screenwidth(), win.winfo_screenheight()
    ww, wh = win.winfo_width(), win.winfo_height()
    win.geometry(f"+{(sw-ww)//2}+{(sh-wh)//2}")
    root.mainloop()


def main():
    parser = argparse.ArgumentParser(description="KSPO 수영장 레인 자동 신청 매크로")
    parser.add_argument("--gui", action="store_true", help="GUI 창을 띄워 필수값(날짜/시간/레인) 입력")
    parser.add_argument("--date", type=str, help="예약 날짜 (YYYYMMDD)")
    parser.add_argument("--times", nargs="*", default=[], help="원하는 시작 시각들 (예: 09:00 10:00)")
    parser.add_argument("--lanes", nargs="*", type=int, default=[], help="원하는 레인 번호들 (예: 1 3)")
    parser.add_argument("--view-mode", "--view_mode", dest="view_mode", choices=["date", "court"], default="date", help="화면 모드 (기본: date)")
    parser.add_argument("--headless", action="store_true", help="헤드리스 모드")
    parser.add_argument("--fire-at", "--fire_at", dest="fire_at", type=str, help="실행 대기 목표 시각(HH:MM:SS, KST)")
    parser.add_argument("--watch-openings", "--watch_openings", dest="watch_openings", action="store_true", help="비침투 감시 모드(가용 여부만 확인)")
    parser.add_argument("--scan-dates", "--scan_dates", dest="scan_dates", action="store_true", help="주말 위주 가용 스캔")
    parser.add_argument("--scan-max-dates", "--scan_max_dates", dest="scan_max_dates", type=int, default=30, help="스캔 범위 일수 (기본:30)")
    parser.add_argument("--direct-pay", "--direct_pay", dest="direct_pay", action="store_true", help="바로결제 버튼 클릭까지 수행")
    parser.add_argument("--config", type=str, default="olympic_lane.config.json", help="기본값 설정 JSON 경로")
    parser.add_argument(
        "--mock-available",
        dest="mock_available",
        action="store_true",
        help="테스트 모드: 서버 응답을 모의로 만들어 장바구니 담기 흐름만 검증(실서버에 영향 없음)",
    )
    args = parser.parse_args()

    # 설정 파일 반영
    cfg = load_config_from_json(Path(args.config))
    date_str = args.date or cfg.get("date")
    times = args.times or cfg.get("times", [])
    lanes = args.lanes or cfg.get("lanes", [])
    view_mode = args.view_mode or cfg.get("view_mode", "date")
    headless = args.headless or bool(cfg.get("headless", False))
    fire_at = args.fire_at or cfg.get("fire_at")

    # GUI 모드: Tk 창에서 값 수집
    if args.gui:
        gui_defaults = {
            "date": date_str or "",
            "times": times or [],
            "lanes": lanes or [],
            "headless": headless,
            "view_mode": view_mode,
            "fire_at": fire_at or "",
            "scan_max_dates": args.scan_max_dates,
            "mock_available": getattr(args, "mock_available", False),
        }
        gui_vals = gui_collect_params(gui_defaults)

        # GUI가 값을 주면 그걸 우선 적용
        date_str = gui_vals["date"]
        times = gui_vals["times"]
        lanes = gui_vals["lanes"]
        headless = gui_vals["headless"]
        view_mode = gui_vals["view_mode"]
        fire_at = gui_vals["fire_at"] or None
        direct_pay_from_gui = gui_vals["direct_pay"]
        watch_openings_from_gui = gui_vals["watch_openings"]
        scan_dates_from_gui = gui_vals["scan_dates"]
        scan_max_from_gui = gui_vals["scan_max_dates"]

        # CLI 플래그에 GUI 선택 반영
        if watch_openings_from_gui:
            args.watch_openings = True
        if scan_dates_from_gui:
            args.scan_dates = True
            args.scan_max_dates = scan_max_from_gui
        if direct_pay_from_gui:
            args.direct_pay = True
        if gui_vals.get("mock_available"):
            args.mock_available = True

    # 필수값이 없으면 자동으로 GUI를 띄워 입력받기(헤드리스가 아닐 때)
    if not (args.watch_openings or args.scan_dates) and (not date_str or not times or not lanes) and not headless:
        log("필수값이 없어 GUI를 띄웁니다.")
        gui_defaults = {
            "date": date_str or "",
            "times": times or [],
            "lanes": lanes or [],
            "headless": headless,
            "view_mode": view_mode,
            "fire_at": fire_at or "",
            "scan_max_dates": args.scan_max_dates,
            "mock_available": getattr(args, "mock_available", False),
        }
        gui_vals = gui_collect_params(gui_defaults)
        date_str = gui_vals["date"]
        times = gui_vals["times"]
        lanes = gui_vals["lanes"]
        headless = gui_vals["headless"]
        view_mode = gui_vals["view_mode"]
        fire_at = gui_vals["fire_at"] or None
        if gui_vals["watch_openings"]:
            args.watch_openings = True
        if gui_vals["scan_dates"]:
            args.scan_dates = True
            args.scan_max_dates = gui_vals["scan_max_dates"]
        if gui_vals["direct_pay"]:
            args.direct_pay = True
        if gui_vals.get("mock_available"):
            args.mock_available = True

    if args.watch_openings or args.scan_dates:
        # 감시/스캔 모드: 날짜/시간만 필수
        if not date_str or not times:
            print("--date와 --times는 필수입니다.")
            sys.exit(2)

    # 필수 파라미터 확인
    if not (args.watch_openings or args.scan_dates):
        # 일반 예약 모드: 날짜/시간/레인 필수
        if not date_str or not times or not lanes:
            print("필수 인자 누락. 예) --date 20250907 --times 09:00 10:00 --lanes 1 4 5")
            sys.exit(2)

    try:
        date_str = parse_date_yyyymmdd(date_str)
        times = [parse_time_hhmm(t) for t in times]
    except ValueError as e:
        print(str(e))
        sys.exit(2)

    olym_id = os.getenv("OLYM_ID")
    olym_pw = os.getenv("OLYM_PW")

    context = None
    try:
        context = launch_context(headless=headless)
        page = context.new_page()
        # 실패 빠른 감지를 위한 타임아웃 조정(필요 시 재시도 루프)
        try:
            page.set_default_timeout(4000)
            page.set_default_navigation_timeout(6000)
        except Exception:
            pass
        log(f"실행 파라미터: date={date_str}, times={times}, lanes={lanes}, fire_at={fire_at or 'N/A'}, headless={headless}, view_mode={view_mode}")

        # 테스트 모드면 모의 응답 설치 (실서버 호출 차단)
        if getattr(args, "mock_available", False):
            install_mocks(context, date_str, times, lanes)
            if args.direct_pay:
                log("테스트 모드에서는 바로결제를 비활성화합니다.")
            args.direct_pay = False
            log("TEST MODE ON: 모의 응답으로 장바구니 흐름만 검증합니다. 실서버에 영향 없습니다.")

        # ① 브라우저 즉시 오픈 → 로그인 준비
        ensure_logged_in(page, olym_id, olym_pw)
        # ② 사용자 수동 로그인 확인(‘준비 완료’)
        wait_user_ready_and_login(page)
        # ③ 예약 페이지 진입까지 미리 이동(세션 고정)
        goto_reservation(page)
        set_view_mode(page, view_mode)
        # ④ 발사 직전 예열: 시간목록 1회 호출(스크립트/연결 웜업)
        if fire_at:
            try:
                exec_js_time_list(page, date_str)
            except Exception:
                pass
        # ⑤ 발사 시각까지 대기(브라우저/세션 유지)
        wait_until_fire_at(fire_at)

        if args.watch_openings:
            watch_openings(page, date_str, times, lanes)
            return

        if args.scan_dates:
            scan_dates(page, date_str, args.scan_max_dates, times)
            return

        # 예약 실제 흐름 (오픈 전에는 선택 시도하지 않음; 필요 시 폴링)
        if view_mode == "date":
            exec_js_time_list(page, date_str)
            try:
                select_times(page, times, date_str)
            except RuntimeError:
                log("요청 시간대가 아직 열리지 않았습니다. 폴링 대기 후 재시도…")
                ok = wait_until_openable(page, date_str, times, timeout_sec=900, poll_ms=200)
                if not ok:
                    log("대기시간 내 오픈되지 않아 종료합니다.")
                    return
                select_times(page, times, date_str)
            select_lanes(page, lanes)
        else:
            exec_js_time_list(page, date_str)
            try:
                select_times(page, times, date_str)
            except RuntimeError:
                log("요청 시간대가 아직 열리지 않았습니다. 폴링 대기 후 재시도…")
                ok = wait_until_openable(page, date_str, times, timeout_sec=900, poll_ms=200)
                if not ok:
                    log("대기시간 내 오픈되지 않아 종료합니다.")
                    return
                select_times(page, times, date_str)
            select_lanes(page, lanes)

        total = get_basket_total(page)
        if total:
            log(f"장바구니 합계: {total}")
        else:
            log("경고: 장바구니 합계 확인 불가(선택 실패/제약시간 가능)")

        if args.direct_pay:
            click_direct_payment(page)
            log("약관/결제 단계로 이동(브라우저에서 마무리 하세요)")

        log("완료")
        # 사용자에게 종료 여부를 묻고, Yes일 때만 브라우저를 닫음
        prompt_browser_close(context, headless=headless)
        return
    except SystemExit:
        # 명시적 종료 요청은 통과
        raise
    except KeyboardInterrupt:
        log("사용자 중단(CTRL+C) 감지")
        traceback.print_exc()
        hold_on_error("사용자 중단으로 작업이 중단되었습니다.", headless)
    except Exception as e:
        log(f"오류 발생: {e}")
        traceback.print_exc()
        hold_on_error(str(e), headless)
    finally:
        # headless 예외/중단 시 안전 종료 (이미 닫혀 있어도 에러 없음)
        if context and headless:
            try:
                context.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
