# Update .env file with pooler connection
$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    # Replace direct connection with pooler connection
    $content = $content -replace 'db\.uucjdcbtpunfsyuixsmc\.supabase\.co:5432', 'aws-0-sa-east-1.pooler.supabase.com:6543'
    $content = $content -replace 'postgres:thusanang', 'postgres.uucjdcbtpunfsyuixsmc:thusanang'
    Set-Content $envPath -Value $content
    Write-Host "✅ Updated .env file with pooler connection"
    Write-Host "New DATABASE_URL uses: aws-0-sa-east-1.pooler.supabase.com:6543"
} else {
    Write-Host "❌ .env file not found at: $envPath"
}

