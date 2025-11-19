#!/usr/bin/env python3
import os
import subprocess
import sys

# Path to CTBAL project
ctbal_project_path = r"c:\Users\djman\OneDrive\Documents\GitHub\ctbal"
processed_csvs_path = r"c:\Users\djman\OneDrive\Documents\GitHub\scrape-a-grave\processed_csvs"

# States array from launchfindagrave.py
states = [
    {"abbreviation": "AL", "name": "Alabama", "location_id": "state_3"},
    {"abbreviation": "AK", "name": "Alaska", "location_id": "state_2"},
    {"abbreviation": "AZ", "name": "Arizona", "location_id": "state_5"},
    {"abbreviation": "AR", "name": "Arkansas", "location_id": "state_4"},
    {"abbreviation": "CA", "name": "California", "location_id": "state_6"},
    {"abbreviation": "CO", "name": "Colorado", "location_id": "state_7"},
    {"abbreviation": "CT", "name": "Connecticut", "location_id": "state_8"},
    {"abbreviation": "DE", "name": "Delaware", "location_id": "state_10"},
    {"abbreviation": "DC", "name": "District of Columbia", "location_id": "state_9"},
    {"abbreviation": "FL", "name": "Florida", "location_id": "state_11"},
    {"abbreviation": "GA", "name": "Georgia", "location_id": "state_12"},
    {"abbreviation": "HI", "name": "Hawaii", "location_id": "state_13"},
    {"abbreviation": "ID", "name": "Idaho", "location_id": "state_15"},
    {"abbreviation": "IL", "name": "Illinois", "location_id": "state_16"},
    {"abbreviation": "IN", "name": "Indiana", "location_id": "state_17"},
    {"abbreviation": "IA", "name": "Iowa", "location_id": "state_14"},
    {"abbreviation": "KS", "name": "Kansas", "location_id": "state_18"},
    {"abbreviation": "KY", "name": "Kentucky", "location_id": "state_19"},
    {"abbreviation": "LA", "name": "Louisiana", "location_id": "state_20"},
    {"abbreviation": "ME", "name": "Maine", "location_id": "state_22"}
]

def add_processed_csvs_to_queue():
    """Add all processed CSV files to CTBAL queue"""
    
    if not os.path.exists(processed_csvs_path):
        print(f"❌ Processed CSVs directory not found: {processed_csvs_path}")
        return
    
    # Get all CSV files in processed_csvs directory
    csv_files = []
    for file in os.listdir(processed_csvs_path):
        if file.endswith('.csv') and '_us_recent_deaths.csv' in file:
            csv_files.append(file)
    
    print(f"🔍 Found {len(csv_files)} processed CSV files")
    
    success_count = 0
    for csv_file in sorted(csv_files):
        try:
            # Extract state abbreviation from filename (e.g., "FL_20251118_210521_us_recent_deaths.csv")
            state_abbrev = csv_file.split('_')[0]
            
            # Find state info
            state_info = next((s for s in states if s['abbreviation'] == state_abbrev), None)
            state_name = state_info['name'] if state_info else state_abbrev
            
            csv_full_path = os.path.join(processed_csvs_path, csv_file)
            
            print(f"\n📤 Adding {state_name} ({state_abbrev}) to CTBAL queue...")
            print(f"   File: {csv_file}")
            
            # Use npm command to add to queue
            cmd = f'npm run queue:add "{csv_full_path}"'
            
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=ctbal_project_path,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            if result.returncode == 0:
                print(f"   ✅ {state_name} successfully added to queue")
                success_count += 1
            else:
                print(f"   ❌ Failed to add {state_name}")
                if result.stderr:
                    print(f"   Error: {result.stderr.strip()}")
                    
        except Exception as e:
            print(f"   ❌ Error processing {csv_file}: {e}")
    
    print(f"\n🎉 Transfer Summary:")
    print(f"   ✅ Successfully queued: {success_count}")
    print(f"   ❌ Failed: {len(csv_files) - success_count}")
    print(f"   📊 Total files: {len(csv_files)}")

if __name__ == "__main__":
    add_processed_csvs_to_queue()