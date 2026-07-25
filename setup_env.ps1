# setup_env.ps1
# Setup portable environment for Node.js and PostgreSQL

$ErrorActionPreference = "Stop"

$workspaceDir = "c:\Users\Administrator\Desktop\Filling system"
$devToolsDir = Join-Path $workspaceDir "dev-tools"
$tempDir = Join-Path $workspaceDir "temp"

# 1. Create directories
if (-not (Test-Path $devToolsDir)) {
    New-Item -ItemType Directory -Path $devToolsDir | Out-Null
    Write-Host "Created dev-tools directory."
}
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    Write-Host "Created temp directory."
}

# 2. URLs for downloads
$nodeUrl = "https://nodejs.org/dist/v20.12.2/node-v20.12.2-win-x64.zip"
$postgresUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64-binaries.zip"

$nodeZip = Join-Path $tempDir "node.zip"
$postgresZip = Join-Path $tempDir "postgres.zip"

# 3. Download Node.js
if (-not (Test-Path (Join-Path $devToolsDir "node\node.exe"))) {
    Write-Host "Downloading Node.js..."
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
    Write-Host "Extracting Node.js..."
    Expand-Archive -Path $nodeZip -DestinationPath $tempDir -Force
    
    # Move and rename the extracted folder to dev-tools/node
    $extractedNodeDir = Join-Path $tempDir "node-v20.12.2-win-x64"
    $targetNodeDir = Join-Path $devToolsDir "node"
    if (Test-Path $targetNodeDir) { Remove-Item $targetNodeDir -Recurse -Force }
    Move-Item -Path $extractedNodeDir -Destination $targetNodeDir
    Write-Host "Node.js set up successfully."
} else {
    Write-Host "Node.js is already set up."
}

# 4. Download PostgreSQL
if (-not (Test-Path (Join-Path $devToolsDir "pgsql\bin\pg_ctl.exe"))) {
    Write-Host "Downloading PostgreSQL..."
    Invoke-WebRequest -Uri $postgresUrl -OutFile $postgresZip -UseBasicParsing
    Write-Host "Extracting PostgreSQL..."
    Expand-Archive -Path $postgresZip -DestinationPath $devToolsDir -Force
    Write-Host "PostgreSQL set up successfully."
} else {
    Write-Host "PostgreSQL is already set up."
}

# 5. Clean up temp folder
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
    Write-Host "Cleaned up temp files."
}

# 6. Verify binaries
$nodeExe = Join-Path $devToolsDir "node\node.exe"
$npmCmd = Join-Path $devToolsDir "node\npm.cmd"
$psqlExe = Join-Path $devToolsDir "pgsql\bin\psql.exe"

Write-Host "`nEnvironment Verification:"
if (Test-Path $nodeExe) {
    $nodeVersion = & $nodeExe -v
    Write-Host "Node Version: $nodeVersion"
} else {
    Write-Warning "node.exe not found!"
}

if (Test-Path $npmCmd) {
    $npmVersion = & $npmCmd -v
    Write-Host "NPM Version: $npmVersion"
} else {
    Write-Warning "npm.cmd not found!"
}

if (Test-Path $psqlExe) {
    $psqlVersion = & $psqlExe --version
    Write-Host "Postgres Version: $psqlVersion"
} else {
    Write-Warning "psql.exe not found!"
}
