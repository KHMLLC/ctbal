#!/usr/bin/env python3
"""
Add all new CSV files from processed_csvs to CTBAL queue
"""

import subprocess
import os
import glob
from pathlib import Path

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
    {"abbreviation": "ME", "name": "Maine", "location_id": "state_22"},
    {"abbreviation": "MD", "name": "Maryland", "location_id": "state_23"},
    {"abbreviation": "MA", "name": "Massachusetts", "location_id": "state_21"},
    {"abbreviation": "MI", "name": "Michigan", "location_id": "state_24"},
    {"abbreviation": "MN", "name": "Minnesota", "location_id": "state_25"},
    {"abbreviation": "MS", "name": "Mississippi", "location_id": "state_27"},
    {"abbreviation": "MO", "name": "Missouri", "location_id": "state_26"},
    {"abbreviation": "MT", "name": "Montana", "location_id": "state_28"},
    {"abbreviation": "NE", "name": "Nebraska", "location_id": "state_31"},
    {"abbreviation": "NV", "name": "Nevada", "location_id": "state_35"},
    {"abbreviation": "NH", "name": "New Hampshire", "location_id": "state_32"},
    {"abbreviation": "NJ", "name": "New Jersey", "location_id": "state_33"},
    {"abbreviation": "NM", "name": "New Mexico", "location_id": "state_34"},
    {"abbreviation": "NY", "name": "New York", "location_id": "state_36"},
    {"abbreviation": "NC", "name": "North Carolina", "location_id": "state_29"},
    {"abbreviation": "ND", "name": "North Dakota", "location_id": "state_30"},
    {"abbreviation": "OH", "name": "Ohio", "location_id": "state_37"},
    {"abbreviation": "OK", "name": "Oklahoma", "location_id": "state_38"},
    {"abbreviation": "OR", "name": "Oregon", "location_id": "state_39"},
    {"abbreviation": "PA", "name": "Pennsylvania", "location_id": "state_40"},
    {"abbreviation": "PR", "name": "Puerto Rico", "location_id": "state_41"},
    {"abbreviation": "RI", "name": "Rhode Island", "location_id": "state_42"},
    {"abbreviation": "SC", "name": "South Carolina", "location_id": "state_43"},
    {"abbreviation": "SD", "name": "South Dakota", "location_id": "state_44"},
    {"abbreviation": "TN", "name": "Tennessee", "location_id": "state_45"},
    {"abbreviation": "TX", "name": "Texas", "location_id": "state_46"},
    {"abbreviation": "UT", "name": "Utah", "location_id": "state_47"},
    {"abbreviation": "VT", "name": "Vermont", "location_id": "state_49"},
    {"abbreviation": "VI", "name": "Virgin Islands, U.S.", "location_id": "country_273"},
    {"abbreviation": "VA", "name": "Virginia", "location_id": "state_48"},
    {"abbreviation": "WA", "name": "Washington", "location_id": "state_50"},
    {"abbreviation": "WV", "name": "West Virginia", "location_id": "state_52"},
    {"abbreviation": "WI", "name": "Wisconsin", "location_id": "state_51"},
    {"abbreviation": "WY", "name": "Wyoming", "location_id": "state_53"},
    {"abbreviation": "NYC", "name": "New York City", "location_id": "state_56"},
    {"abbreviation": "AS", "name": "American Samoa", "location_id": "state_57"},
    {"abbreviation": "GU", "name": "Guam", "location_id": "state_58"},
    {"abbreviation": "MP", "name": "Northern Mariana Islands", "location_id": "state_59"},
    {"abbreviation": "UM", "name": "United States Minor Outlying Islands", "location_id": "state_61"}
]

def add_csv_to_queue(csv_file_path, state_abbrev):
    """Add a CSV file to CTBAL processing queue"""
    try:
        cmd = f'npm run queue:add -- "{csv_file_path}"'
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=os.getcwd(),
            capture_output=True, 
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            print(f"✅ {state_abbrev}: Added to queue successfully")
            return True
        else:
            print(f"❌ {state_abbrev}: Failed to add to queue")
            if result.stderr:
                print(f"   Error: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"❌ {state_abbrev}: Exception occurred - {e}")
        return False

def main():
    processed_csvs_dir = r"C:\Users\djman\OneDrive\Documents\GitHub\scrape-a-grave\processed_csvs"
    
    print("🚀 Adding all processed CSV files to CTBAL queue...")
    print(f"📂 Searching directory: {processed_csvs_dir}")
    
    # Get all CSV files in processed_csvs directory
    csv_pattern = os.path.join(processed_csvs_dir, "*.csv")
    csv_files = glob.glob(csv_pattern)
    
    print(f"📋 Found {len(csv_files)} CSV files")
    
    # Track processing results
    added_count = 0
    failed_count = 0
    
    # Process each CSV file
    for csv_file in sorted(csv_files):
        filename = os.path.basename(csv_file)
        
        # Extract state abbreviation from filename (format: XX_timestamp_us_recent_deaths.csv)
        state_abbrev = filename.split('_')[0] if '_' in filename else 'UNK'
        
        print(f"\n🔄 Processing: {filename}")
        
        if add_csv_to_queue(csv_file, state_abbrev):
            added_count += 1
        else:
            failed_count += 1
    
    print(f"\n🎉 Processing complete!")
    print(f"   ✅ Successfully added: {added_count}")
    print(f"   ❌ Failed to add: {failed_count}")
    print(f"   📊 Total processed: {added_count + failed_count}")
    
    if added_count > 0:
        print(f"\n💡 Run 'npm run queue:status' to see updated queue")
        print(f"💡 Run 'npm run queue:process-all' to deploy all to blockchain")

if __name__ == "__main__":
    main()