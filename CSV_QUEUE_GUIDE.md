# CTBAL CSV Queue System

## Overview
The CSV Queue Manager prevents file overlays and processes state mortality data systematically across all 53 states.

## Directory Structure
```
csv-queue/          # Pending CSV files 
csv-processing/     # Currently processing
csv-completed/      # Successfully processed
csv-failed/         # Failed processing
queue-status.json   # Queue state tracking
```

## Usage Workflow

### 1. Add State Files to Queue
```bash
# Add individual state files
npm run queue:add -- path/to/us_recent_deaths_california.csv
npm run queue:add -- path/to/us_recent_deaths_texas.csv
npm run queue:add -- path/to/us_recent_deaths_florida.csv

# System automatically detects state from filename
# Prevents duplicates - newer files replace pending ones
```

### 2. Check Queue Status
```bash
npm run queue:status
# Shows:
# - Pending files (waiting to process)
# - Processing files (currently running)
# - Completed files (success with stats)
# - Failed files (need investigation)
```

### 3. Process Files
```bash
# Process next file in queue
npm run queue:process

# Process ALL queued files (automated)
npm run queue:process-all
# Includes delays between states for network stability
```

## State Detection
Auto-detects state from filename patterns:
- `us_recent_deaths_wyoming.csv` → Wyoming
- `california_deaths.csv` → California  
- `texas_mortality_2024.csv` → Texas
- `deaths_florida.csv` → Florida

## Token Allocation by Age (Optimized for Scale)
- **Under 50**: 100 CTBAL (Early Mortality Risk)
- **50-75**: 75 CTBAL (Mid-Life Health Analysis)  
- **75+**: 50 CTBAL (Geriatric Care Study)
- **High-Risk States** (WY, MT, AK, WV): +25 CTBAL bonus

## Processing Features
- **Batch Processing**: 10 records per batch for efficiency
- **Role Management**: Auto-grants clinician role if needed
- **Analytics Updates**: Refreshes metrics after each state
- **Error Handling**: Failed files moved to failed directory
- **Resume Capability**: Can restart processing from any point

## Scale Handling
For your 530,000 weekly records (10,000 × 53 states):
- **Queue prevents overlays** - new state files replace pending ones
- **Systematic processing** - one state at a time, no conflicts
- **Resource management** - built-in delays and batch limits
- **Progress tracking** - full visibility into processing status

## Example State Processing Flow
```
1. Wyoming added to queue (34 records)
2. Status: Wyoming PENDING
3. Process Wyoming: 34/34 success → 8,050 CTBAL
4. Status: Wyoming COMPLETED  
5. California added to queue (8,500 records estimated)
6. Process California: [automated batch processing]
7. Status: California COMPLETED, Wyoming COMPLETED
```

## Safety Features
- **No Overlays**: State replacement only affects pending files
- **Atomic Processing**: Files moved through directories safely  
- **Rollback Support**: Failed files preserved for retry
- **State Isolation**: Each state processed independently
- **Progress Persistence**: Queue survives system restarts

## Commands Reference
```bash
# Manual queue management
npm run queue:add -- file.csv      # Add file to queue
npm run queue:process              # Process next pending
npm run queue:process-all          # Process all pending  
npm run queue:status               # Show queue status

# Scrape-a-grave integration
npm run scrape:transfer            # Transfer existing CSV files from scrape-a-grave
npm run scrape:full-pipeline       # Transfer + Show Status + Process All
```

## Scrape-a-Grave Integration

The system now **automatically transfers CSV files** when your `launchfindagrave.py` completes:

### Automatic Transfer (Modified launchfindagrave.py)
- When `launch_scraper_for_state(state)` finishes successfully on line 92
- Automatically finds the generated CSV file
- Adds it to CTBAL queue using `npm run queue:add`
- Provides success/failure feedback for each state

### Manual Batch Transfer
```bash
# Transfer all existing CSV files from scrape-a-grave directory
npm run scrape:transfer

# Complete pipeline: transfer all CSVs → show status → process all
npm run scrape:full-pipeline
```

The system is designed to handle your massive 530K weekly volume with **zero file conflicts** and **complete processing visibility**.