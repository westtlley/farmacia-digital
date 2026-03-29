$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

if (-not $env:DATABASE_URL) {
  throw 'Defina DATABASE_URL antes de executar o restore.'
}

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Arquivo de backup nao encontrado: $BackupFile"
}

Write-Host "Restaurando backup $BackupFile"
pg_restore --clean --if-exists --no-owner --dbname "$env:DATABASE_URL" "$BackupFile"
Write-Host 'Restore concluido com sucesso.'
