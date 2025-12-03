# Start Hardhat node with administrator privileges for Windows Firewall bypass
# This script should be run as administrator

Write-Host "🔥 Starting Hardhat node with administrator privileges..." -ForegroundColor Yellow

# Change to the correct directory
Set-Location "C:\Users\djman\OneDrive\Documents\GitHub\ctbal"

# Start Hardhat node
npx hardhat node --hostname 0.0.0.0 --port 8545