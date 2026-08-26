# Android startup baseline

TASK-271 keeps startup measurement reproducible without making an emulator a
release prerequisite. Build and unit gates run on the host; launch timings are
collected on an available emulator/device with:

```powershell
$env:ANDROID_HOME = 'C:\Users\NTNghia\AppData\Local\Android\Sdk'
pwsh -File apps/mobile/scripts/measure-startup.ps1 -Runs 3
```

The script records `am start -W` cold and warm `TotalTime`, `WaitTime`, and
`ThisTime` values for the debug application. A cold run force-stops the process;
the warm run reuses the already initialized process. Record the output with the
device/API level when a device is available instead of inventing host-only
numbers.

The Phase 2 startup changes are: cached username renders the authenticated
shell before background `/auth/me` verification, dashboard/library Room reads
render before network refresh, and top-level navigation destinations are
remembered. Live attempts still bypass read cache and restore from the server.

Measured on 2026-08-27 with the local `Medium_Phone_API_36.1` AVD
(`sdk_gphone64_x86_64`, API 36) after installing the debug APK:

| run | mode | total_ms | wait_ms | this_ms |
| ---: | --- | ---: | ---: | ---: |
| 1 | cold | 1583 | 1586 | unavailable |
| 1 | warm | 0 | 9 | unavailable |
| 2 | cold | 1606 | 1759 | unavailable |
| 2 | warm | 0 | 12 | unavailable |
| 3 | cold | 1598 | 1605 | unavailable |
| 3 | warm | 0 | 11 | unavailable |

The API 36 `am start -W` output did not include `ThisTime`; the script leaves
that optional field blank and records the available `TotalTime`/`WaitTime`
values. These numbers are a local debug-emulator baseline, not a production
SLO or a physical-device claim.
