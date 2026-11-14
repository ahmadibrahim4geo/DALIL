<#
 .SYNOPSIS
  إنشاء اختصار رسمي لأداة دليل (DALIL) على سطح المكتب بأيقونة الويندوز المعتمدة (.ico)
 .DESCRIPTION
  يقوم بإنشاء اختصار مباشر على سطح المكتب يقوم بفتح لوحة تحكم دليل (Dashboard) في وضع التطبيق المستقل (Chrome App Window)
#>

param([ValidatePattern('^[a-p]{32}$')][string]$ExtensionId)

$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "دليل (DALIL) - GIS Harvester.lnk"
$shortcut = $wscript.CreateShortcut($shortcutPath)

# البحث عن مسار متصفح جوجل كروم على النظام
$chromePath = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$iconPath = Join-Path $PSScriptRoot "assets\dalil_app.ico"

if ($chromePath) {
    $shortcut.TargetPath = $chromePath
    # يفتح المتصفح مباشرة على صفحة الإضافات أو رابط الداشبورد
    $launchUrl = if ($ExtensionId) { "chrome-extension://$ExtensionId/dashboard/dashboard.html" } else { "chrome://extensions/" }
    $shortcut.Arguments = "--new-window $launchUrl"
    $shortcut.IconLocation = "$iconPath, 0"
    $shortcut.Description = "دليل (DALIL) - منصة المسح الجغرافي واستخراج إحداثيات X و Y"
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Save()
    Write-Host "تم إنشاء اختصار دليل (DALIL) بنجاح على سطح المكتب: $shortcutPath" -ForegroundColor Green
} else {
    Write-Warning "لم يتم العثور على متصفح Google Chrome على جهازك."
}
