$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
  throw 'Defina DATABASE_URL antes de executar o backup.'
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupDir = Join-Path $PSScriptRoot '..\\backups\\postgres'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$resolvedDir = (Resolve-Path -LiteralPath $backupDir).Path
$outputFile = Join-Path $resolvedDir "farmacia_digital_$timestamp.dump"

Write-Host "Gerando backup do Postgres em $outputFile"
pg_dump --format=custom --file "$outputFile" "$env:DATABASE_URL"
Write-Host 'Backup concluido com sucesso.'
