@echo off
REM Quick view of attendance data

cd /d "%~dp0"

echo ========================================
echo   ATTENDANCE DATA VIEWER
echo ========================================
echo.
echo 1. View in browser: http://localhost:8000/attendance/today
echo 2. View in browser: http://localhost:8000/attendance/all
echo 3. Run Python viewer: python view_attendance.py
echo.
echo ========================================
echo   TODAY'S ATTENDANCE QUICK VIEW
echo ========================================
echo.

python -c "import json; from datetime import datetime; data = json.load(open('attendance.json')); today = datetime.now().date(); today_records = [r for r in data if datetime.fromisoformat(r['timestamp']).date() == today]; print(f'Total today: {len(today_records)}'); [print(f\"{i+1}. {r['name']} - {datetime.fromisoformat(r['timestamp']).strftime('%%H:%%M:%%S')} - {r['confidence']:.1f}%%\") for i, r in enumerate(today_records)]"

echo.
echo ========================================
echo   ALL TIME SUMMARY
echo ========================================
echo.

python -c "import json; data = json.load(open('attendance.json')); summary = {}; [summary.update({r['name']: summary.get(r['name'], 0) + 1}) for r in data]; print(f'Total records: {len(data)}'); print(f'Unique people: {len(summary)}'); print('\nBreakdown:'); [print(f'  {name}: {count} times') for name, count in sorted(summary.items(), key=lambda x: x[1], reverse=True)]"

echo.
pause
