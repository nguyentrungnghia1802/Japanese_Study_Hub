[CmdletBinding()]
param(
  [string]$SourceDatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SourceDatabaseUrl)) {
  throw 'DATABASE_URL is required. Pass -SourceDatabaseUrl or set DATABASE_URL.'
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql is required for the migration verification harness.'
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw 'pnpm is required for the migration verification harness.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$prismaRoot = Join-Path $repoRoot 'apps/api/prisma'
$schemaPath = Join-Path $prismaRoot 'schema.prisma'
$migrationRoot = Join-Path $prismaRoot 'migrations'
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('jsh-phase3-migrations-' + [Guid]::NewGuid().ToString('N'))
$runId = [DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff')
$freshDatabase = 'jsh_phase2_fresh_' + $runId
$upgradeDatabase = 'jsh_phase2_upgrade_' + $runId
$createdDatabases = @()

$sourceUri = [Uri]$SourceDatabaseUrl

function New-DatabaseUrl {
  param([string]$DatabaseName, [bool]$IncludeQuery)

  $builder = [UriBuilder]$sourceUri
  $builder.Path = '/' + $DatabaseName
  if (-not $IncludeQuery) {
    $builder.Query = ''
  }
  return $builder.Uri.AbsoluteUri
}

function Invoke-Psql {
  param(
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$CaptureOutput
  )

  $psqlBuilder = [UriBuilder]$DatabaseUrl
  $psqlBuilder.Query = ''
  $psqlUrl = $psqlBuilder.Uri.AbsoluteUri

  if ($CaptureOutput) {
    $output = & psql --dbname $psqlUrl -v ON_ERROR_STOP=1 -At -c $Sql
  } else {
    & psql --dbname $psqlUrl -v ON_ERROR_STOP=1 -c $Sql
  }

  if ($LASTEXITCODE -ne 0) {
    throw "psql failed with exit code $LASTEXITCODE."
  }

  if ($CaptureOutput) {
    return (($output -join "`n").Trim())
  }
}

function Invoke-MigrateDeploy {
  param(
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [Parameter(Mandatory = $true)][string]$Schema
  )

  $previousDatabaseUrl = $env:DATABASE_URL
  $env:DATABASE_URL = $DatabaseUrl
  try {
    & pnpm --filter @japanese-learning/api exec prisma migrate deploy --schema $Schema
    if ($LASTEXITCODE -ne 0) {
      throw "prisma migrate deploy failed with exit code $LASTEXITCODE."
    }
  } finally {
    $env:DATABASE_URL = $previousDatabaseUrl
  }
}

function Assert-DatabaseShape {
  param(
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $migrationCount = Invoke-Psql -DatabaseUrl $DatabaseUrl -CaptureOutput -Sql 'SELECT count(*) FROM "_prisma_migrations";'
  if ($migrationCount -ne '9') {
    throw "$Label expected 9 applied migrations, found $migrationCount."
  }

  $requiredTables = @('recent_learning', 'tags', 'flashcard_set_tags', 'exam_tags', 'flashcard_review_logs', 'exam_mistakes', 'dictionary_lookup_history', 'dictionary_favorites')
  foreach ($table in $requiredTables) {
    $exists = Invoke-Psql -DatabaseUrl $DatabaseUrl -CaptureOutput -Sql "SELECT to_regclass('public.$table') IS NOT NULL;"
    if ($exists -ne 't') {
      throw "$Label is missing table $table."
    }
  }

  $requiredColumns = @(
    @{ Table = 'flashcard_sets'; Column = 'is_favorite' },
    @{ Table = 'exams'; Column = 'is_favorite' },
    @{ Table = 'flashcards'; Column = 'fsrs_learning_steps' },
    @{ Table = 'exam_attempts'; Column = 'is_practice' }
  )
  foreach ($column in $requiredColumns) {
    $exists = Invoke-Psql -DatabaseUrl $DatabaseUrl -CaptureOutput -Sql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$($column.Table)' AND column_name = '$($column.Column)');"
    if ($exists -ne 't') {
      throw "$Label is missing column $($column.Table).$($column.Column)."
    }
  }

  Write-Host "$Label migration shape verified: 9 migrations and all Phase 2/3 dictionary tables/columns present."
}

try {
  New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
  $temporarySchema = Join-Path $temporaryRoot 'schema.prisma'
  $temporaryMigrations = Join-Path $temporaryRoot 'migrations'
  New-Item -ItemType Directory -Path $temporaryMigrations -Force | Out-Null
  Copy-Item -LiteralPath $schemaPath -Destination $temporarySchema

  $adminUrl = New-DatabaseUrl -DatabaseName 'postgres' -IncludeQuery:$false
  $freshUrl = New-DatabaseUrl -DatabaseName $freshDatabase -IncludeQuery:$true
  $upgradeUrl = New-DatabaseUrl -DatabaseName $upgradeDatabase -IncludeQuery:$true

  foreach ($database in @($freshDatabase, $upgradeDatabase)) {
    Invoke-Psql -DatabaseUrl $adminUrl -Sql "CREATE DATABASE $database;"
    $createdDatabases += $database
  }

  Write-Host 'Applying the complete migration chain to a fresh database...'
  Invoke-MigrateDeploy -DatabaseUrl $freshUrl -Schema $schemaPath
  Assert-DatabaseShape -DatabaseUrl $freshUrl -Label 'Fresh database'

  $v1Migration = Get-ChildItem -LiteralPath $migrationRoot -Directory | Where-Object { $_.Name -eq '20260826000000_init' }
  if ($null -eq $v1Migration) {
    throw 'V1 init migration directory was not found.'
  }
  Copy-Item -LiteralPath $v1Migration.FullName -Destination (Join-Path $temporaryMigrations $v1Migration.Name) -Recurse

  Write-Host 'Applying V1 only to the upgrade database...'
  Invoke-MigrateDeploy -DatabaseUrl $upgradeUrl -Schema $temporarySchema
  $v1Count = Invoke-Psql -DatabaseUrl $upgradeUrl -CaptureOutput -Sql 'SELECT count(*) FROM "_prisma_migrations";'
  if ($v1Count -ne '1') {
    throw "V1 upgrade setup expected 1 applied migration, found $v1Count."
  }

  Get-ChildItem -LiteralPath $migrationRoot -Directory |
    Where-Object { $_.Name -ne $v1Migration.Name } |
    ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $temporaryMigrations $_.Name) -Recurse
    }

  Write-Host 'Upgrading the V1 database through all Phase 2 and Phase 3 dictionary migrations...'
  Invoke-MigrateDeploy -DatabaseUrl $upgradeUrl -Schema $temporarySchema
  Assert-DatabaseShape -DatabaseUrl $upgradeUrl -Label 'V1 to Phase 2/3 upgrade'
  Write-Host 'Phase 2 and Phase 3 dictionary migration verification passed.'
} finally {
  foreach ($database in $createdDatabases) {
    try {
      Invoke-Psql -DatabaseUrl $adminUrl -Sql "DROP DATABASE IF EXISTS $database WITH (FORCE);"
    } catch {
      Write-Warning ('Could not remove temporary database ' + $database + ': ' + $_.Exception.Message)
    }
  }

  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
