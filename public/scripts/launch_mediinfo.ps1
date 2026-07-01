# launch_mediinfo.ps1
# 메디인포 실행 또는 활성화 스크립트

param(
    [string]$Action = "open"
)

$ProcessName = "MediInfoLoader"
$SW_RESTORE = 9

# --- Win32 API 로드 ---
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

# --- .appref-ms 파일을 와일드카드로 탐색 (한글 폴더명 인코딩 우회) ---
$searchRoot = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$appRefFile = Get-ChildItem -Path $searchRoot -Recurse -Filter "*.appref-ms" -ErrorAction SilentlyContinue | Select-Object -First 1

# --- 현재 실행중인 메디인포 창 활성화 시도 ---
$activated = $false
$procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

if ($procs) {
    foreach ($p in $procs) {
        $hwnd = $p.MainWindowHandle
        if ($hwnd -ne [IntPtr]::Zero) {
            if ([Win32Helper]::IsIconic($hwnd)) {
                [Win32Helper]::ShowWindow($hwnd, $SW_RESTORE) | Out-Null
            }
            [Win32Helper]::SetForegroundWindow($hwnd) | Out-Null
            $activated = $true
            break
        }
    }
}

# --- 실행 중이 아니면 새로 시작 ---
if (-not $activated) {
    if ($appRefFile) {
        Start-Process $appRefFile.FullName
    }
}

# --- 수리의뢰입력 자동화: 앱 로딩 대기 후 UI 자동화 시도 ---
if ($Action -like "*repair*") {
    # 앱이 뜰 때까지 최대 25초 대기
    $waited = 0
    $targetHwnd = [IntPtr]::Zero

    while ($waited -lt 25) {
        Start-Sleep -Seconds 2
        $waited += 2
        $p2 = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
        Select-Object -First 1
        if ($p2) {
            $targetHwnd = $p2.MainWindowHandle
            [Win32Helper]::SetForegroundWindow($targetHwnd) | Out-Null
            break
        }
    }

    # UIAutomation으로 "수리의뢰입력" 메뉴 클릭 시도
    if ($targetHwnd -ne [IntPtr]::Zero) {
        Start-Sleep -Seconds 1
        try {
            Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
            Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue

            $proc3 = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
            Select-Object -First 1

            if ($proc3) {
                $desktop = [System.Windows.Automation.AutomationElement]::RootElement
                $pidCond = New-Object System.Windows.Automation.PropertyCondition(
                    [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
                    [int]$proc3.Id
                )
                $appElem = $desktop.FindFirst(
                    [System.Windows.Automation.TreeScope]::Children,
                    $pidCond
                )

                if ($appElem) {
                    $nameCond = New-Object System.Windows.Automation.PropertyCondition(
                        [System.Windows.Automation.AutomationElement]::NameProperty,
                        "수리의뢰입력"
                    )
                    $menuItem = $appElem.FindFirst(
                        [System.Windows.Automation.TreeScope]::Descendants,
                        $nameCond
                    )

                    if ($menuItem) {
                        $invokePattern = $menuItem.GetCurrentPattern(
                            [System.Windows.Automation.InvokePattern]::Pattern
                        )
                        $invokePattern.Invoke()
                    }
                }
            }
        }
        catch {
            # UI 자동화 실패해도 앱은 열려 있으므로 무시
        }
    }
}
