import subprocess
import os
import glob
import shutil
from pathlib import Path
import sys

# Configuration paths
SCRAPE_A_GRAVE_PATH = r"c:\Users\djman\OneDrive\Documents\GitHub\scrape-a-grave"
CTBAL_PROJECT_PATH = r"c:\Users\djman\OneDrive\Documents\GitHub\ctbal"

def find_state_csv_files():
    """Find all state CSV files in scrape-a-grave directory"""
    os.chdir(SCRAPE_A_GRAVE_PATH)
    
    # Common patterns for state mortality CSVs
    patterns = [
        "us_recent_deaths_*.csv",
        "*_deaths.csv",
        "deaths_*.csv", 
        "mortality_*.csv",
        "*_mortality.csv"
    ]
    
    csv_files = []
    for pattern in patterns:
        matches = glob.glob(pattern)
        csv_files.extend(matches)
    
    # Remove duplicates and return absolute paths
    unique_files = list(set(csv_files))
    return [os.path.abspath(f) for f in unique_files]

def extract_state_from_filename(filename):
    """Extract state name from various CSV filename formats"""
    basename = Path(filename).stem.lower()
    
    # State mapping for common abbreviations and names
    state_patterns = {
        'alabama': 'Alabama', 'alaska': 'Alaska', 'arizona': 'Arizona', 'arkansas': 'Arkansas',
        'california': 'California', 'colorado': 'Colorado', 'connecticut': 'Connecticut',
        'delaware': 'Delaware', 'florida': 'Florida', 'georgia': 'Georgia', 'hawaii': 'Hawaii',
        'idaho': 'Idaho', 'illinois': 'Illinois', 'indiana': 'Indiana', 'iowa': 'Iowa',
        'kansas': 'Kansas', 'kentucky': 'Kentucky', 'louisiana': 'Louisiana', 'maine': 'Maine',
        'maryland': 'Maryland', 'massachusetts': 'Massachusetts', 'michigan': 'Michigan',
        'minnesota': 'Minnesota', 'mississippi': 'Mississippi', 'missouri': 'Missouri',
        'montana': 'Montana', 'nebraska': 'Nebraska', 'nevada': 'Nevada', 'newhampshire': 'New Hampshire',
        'newjersey': 'New Jersey', 'newmexico': 'New Mexico', 'newyork': 'New York',
        'northcarolina': 'North Carolina', 'northdakota': 'North Dakota', 'ohio': 'Ohio',
        'oklahoma': 'Oklahoma', 'oregon': 'Oregon', 'pennsylvania': 'Pennsylvania',
        'rhodeisland': 'Rhode Island', 'southcarolina': 'South Carolina', 'southdakota': 'South Dakota',
        'tennessee': 'Tennessee', 'texas': 'Texas', 'utah': 'Utah', 'vermont': 'Vermont',
        'virginia': 'Virginia', 'washington': 'Washington', 'westvirginia': 'West Virginia',
        'wisconsin': 'Wisconsin', 'wyoming': 'Wyoming'
    }
    
    for pattern, state_name in state_patterns.items():
        if pattern in basename:
            return state_name
    
    return "Unknown"

def transfer_csv_to_queue(csv_file_path):
    """Transfer a CSV file to CTBAL processing queue"""
    try:
        print(f"📤 Adding {Path(csv_file_path).name} to CTBAL queue...")
        
        cmd = f'npm run queue:add -- "{csv_file_path}"'
        result = subprocess.run(cmd, shell=True, cwd=CTBAL_PROJECT_PATH, 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            state = extract_state_from_filename(csv_file_path)
            print(f"✅ {state} CSV successfully queued")
            print(f"   {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Failed to queue {Path(csv_file_path).name}")
            print(f"   Error: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"❌ Error transferring {Path(csv_file_path).name}: {e}")
        return False

def batch_transfer_all_csvs():
    """Find and transfer all existing CSV files to CTBAL queue"""
    print("🔍 Scanning for state mortality CSV files...")
    
    csv_files = find_state_csv_files()
    
    if not csv_files:
        print("📭 No CSV files found in scrape-a-grave directory")
        return
    
    print(f"📊 Found {len(csv_files)} CSV file(s):")
    for csv_file in csv_files:
        state = extract_state_from_filename(csv_file)
        print(f"   {Path(csv_file).name} → {state}")
    
    print(f"\n🚀 Transferring {len(csv_files)} files to CTBAL queue...")
    
    success_count = 0
    for csv_file in csv_files:
        if transfer_csv_to_queue(csv_file):
            success_count += 1
    
    print(f"\n🎉 Transfer Summary:")
    print(f"   ✅ Successfully queued: {success_count}")
    print(f"   ❌ Failed: {len(csv_files) - success_count}")
    print(f"   📊 Total files: {len(csv_files)}")

def show_queue_status():
    """Show current CTBAL queue status"""
    try:
        print("\n📋 Checking CTBAL queue status...")
        cmd = 'npm run queue:status'
        result = subprocess.run(cmd, shell=True, cwd=CTBAL_PROJECT_PATH)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error checking queue status: {e}")
        return False

def process_queue():
    """Process all items in CTBAL queue"""
    try:
        print("\n🚀 Processing all queued CSV files...")
        cmd = 'npm run queue:process-all'
        result = subprocess.run(cmd, shell=True, cwd=CTBAL_PROJECT_PATH)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error processing queue: {e}")
        return False

def main():
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'transfer':
            batch_transfer_all_csvs()
        elif command == 'status':
            show_queue_status()
        elif command == 'process':
            process_queue()
        elif command == 'full':
            print("🔄 Full Pipeline: Transfer → Process")
            batch_transfer_all_csvs()
            print("\n" + "="*50)
            show_queue_status()
            print("\n" + "="*50)
            process_queue()
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: transfer, status, process, full")
    else:
        print("CTBAL-Scrape Integration Tool")
        print("============================")
        print("Commands:")
        print("  transfer  - Transfer all CSV files to CTBAL queue")
        print("  status    - Show CTBAL queue status")
        print("  process   - Process all queued CSV files") 
        print("  full      - Transfer → Show Status → Process All")
        print()
        print("Usage: python ctbal-scrape-integration.py [command]")
        print("Example: python ctbal-scrape-integration.py full")

if __name__ == "__main__":
    main()