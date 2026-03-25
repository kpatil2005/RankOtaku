$file = "C:\Users\kpati\.vscode\RankOtaku\frontend\src\pages\profile\ProfilePage.jsx"
$content = Get-Content $file -Raw
$content = $content -replace 'https://via\.placeholder\.com/[^''\"]+', ''
$content = $content -replace 'onError=\{[^}]+\}', 'onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;background:#1a1a1a;color:#ff6b35;font-size:14px;\">No Image</div>"; }}'
Set-Content $file $content
Write-Host "Replaced all placeholder URLs"
