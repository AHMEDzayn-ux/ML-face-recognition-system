"""
Attendance Data Viewer and Exporter
View attendance logs with filtering and export to Excel
"""

import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import sys

ATTENDANCE_LOG = "attendance.json"


def load_attendance():
    """Load attendance data from JSON file"""
    if not Path(ATTENDANCE_LOG).exists():
        print(f"❌ No attendance data found at {ATTENDANCE_LOG}")
        return []
    
    with open(ATTENDANCE_LOG, 'r') as f:
        data = json.load(f)
    
    return data


def display_all():
    """Display all attendance records"""
    data = load_attendance()
    
    if not data:
        print("No attendance records found.")
        return
    
    print(f"\n📊 Total Records: {len(data)}")
    print("=" * 80)
    
    for i, record in enumerate(data, 1):
        timestamp = datetime.fromisoformat(record['timestamp'])
        print(f"{i}. {record['name']}")
        print(f"   Time: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Confidence: {record['confidence']:.2f}%")
        print(f"   Status: {record['status']}")
        print("-" * 80)


def display_today():
    """Display today's attendance"""
    data = load_attendance()
    
    if not data:
        print("No attendance records found.")
        return
    
    today = datetime.now().date()
    today_records = [
        r for r in data 
        if datetime.fromisoformat(r['timestamp']).date() == today
    ]
    
    if not today_records:
        print(f"No attendance records for today ({today})")
        return
    
    print(f"\n📅 Today's Attendance ({today})")
    print(f"Total: {len(today_records)} records")
    print("=" * 80)
    
    for i, record in enumerate(today_records, 1):
        timestamp = datetime.fromisoformat(record['timestamp'])
        print(f"{i}. {record['name']}")
        print(f"   Time: {timestamp.strftime('%H:%M:%S')}")
        print(f"   Confidence: {record['confidence']:.2f}%")
        print("-" * 80)


def display_summary():
    """Display attendance summary by person"""
    data = load_attendance()
    
    if not data:
        print("No attendance records found.")
        return
    
    # Count by person
    summary = {}
    for record in data:
        name = record['name']
        if name not in summary:
            summary[name] = {
                'count': 0,
                'first_seen': record['timestamp'],
                'last_seen': record['timestamp'],
                'avg_confidence': 0,
                'confidences': []
            }
        
        summary[name]['count'] += 1
        summary[name]['last_seen'] = record['timestamp']
        summary[name]['confidences'].append(record['confidence'])
    
    # Calculate averages
    for name in summary:
        confidences = summary[name]['confidences']
        summary[name]['avg_confidence'] = sum(confidences) / len(confidences)
    
    print("\n👥 Attendance Summary by Person")
    print("=" * 80)
    
    for name, stats in sorted(summary.items(), key=lambda x: x[1]['count'], reverse=True):
        first = datetime.fromisoformat(stats['first_seen'])
        last = datetime.fromisoformat(stats['last_seen'])
        
        print(f"\n{name}")
        print(f"  Total Appearances: {stats['count']}")
        print(f"  First Seen: {first.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Last Seen: {last.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Avg Confidence: {stats['avg_confidence']:.2f}%")
        print("-" * 80)


def export_to_excel():
    """Export attendance data to Excel file"""
    data = load_attendance()
    
    if not data:
        print("No attendance records to export.")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Parse timestamps
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['date'] = df['timestamp'].dt.date
    df['time'] = df['timestamp'].dt.time
    
    # Reorder columns
    df = df[['name', 'date', 'time', 'confidence', 'status']]
    
    # Sort by timestamp
    df = df.sort_values('date')
    
    # Export to Excel
    output_file = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    df.to_excel(output_file, index=False)
    
    print(f"✅ Exported {len(df)} records to {output_file}")


def export_to_csv():
    """Export attendance data to CSV file"""
    data = load_attendance()
    
    if not data:
        print("No attendance records to export.")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Parse timestamps
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Sort by timestamp
    df = df.sort_values('timestamp')
    
    # Export to CSV
    output_file = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df.to_csv(output_file, index=False)
    
    print(f"✅ Exported {len(df)} records to {output_file}")


def main():
    """Main menu"""
    print("\n" + "=" * 80)
    print("📋 ATTENDANCE DATA VIEWER")
    print("=" * 80)
    
    while True:
        print("\nOptions:")
        print("1. View All Records")
        print("2. View Today's Records")
        print("3. View Summary by Person")
        print("4. Export to Excel")
        print("5. Export to CSV")
        print("6. Exit")
        
        choice = input("\nEnter choice (1-6): ").strip()
        
        if choice == '1':
            display_all()
        elif choice == '2':
            display_today()
        elif choice == '3':
            display_summary()
        elif choice == '4':
            try:
                export_to_excel()
            except Exception as e:
                print(f"❌ Error exporting to Excel: {e}")
                print("Make sure 'openpyxl' is installed: pip install openpyxl")
        elif choice == '5':
            export_to_csv()
        elif choice == '6':
            print("\nGoodbye! 👋")
            break
        else:
            print("Invalid choice. Please enter 1-6.")


if __name__ == "__main__":
    main()
