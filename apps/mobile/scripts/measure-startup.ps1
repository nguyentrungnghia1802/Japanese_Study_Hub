param(
    [string]$AdbPath = "$env:ANDROID_HOME\platform-tools\adb.exe",
    [int]$Runs = 3
)

$ErrorActionPreference = 'Stop'
$packageName = 'com.japaneselearning.mobile.debug'
$activityName = "$packageName/com.japaneselearning.mobile.MainActivity"

if (-not (Test-Path -LiteralPath $AdbPath)) {
    throw "adb was not found at '$AdbPath'. Set ANDROID_HOME or pass -AdbPath."
}

$devices = & $AdbPath devices
if (-not ($devices | Select-String "\tdevice$")) {
    throw 'No online Android device/emulator is connected.'
}

function Get-Value([string]$text, [string]$key) {
    $match = [regex]::Match($text, "(?m)^${key}:\s*(\d+)")
    if (-not $match.Success) { return '' }
    return $match.Groups[1].Value
}

"run,mode,total_ms,wait_ms,this_ms"
for ($run = 1; $run -le $Runs; $run++) {
    & $AdbPath shell am force-stop $packageName | Out-Null
    $cold = (& $AdbPath shell am start -W -n $activityName) -join "`n"
    "{0},cold,{1},{2},{3}" -f $run, (Get-Value $cold 'TotalTime'), (Get-Value $cold 'WaitTime'), (Get-Value $cold 'ThisTime')

    $warm = (& $AdbPath shell am start -W -n $activityName) -join "`n"
    "{0},warm,{1},{2},{3}" -f $run, (Get-Value $warm 'TotalTime'), (Get-Value $warm 'WaitTime'), (Get-Value $warm 'ThisTime')
}
