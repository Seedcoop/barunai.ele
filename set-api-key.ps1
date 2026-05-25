param(
  [Parameter(Mandatory = $false)]
  [string]$Key
)

$target = "C:\Users\sodaj\Desktop\교뵤 웹앱\openai-api-key.txt"

if ([string]::IsNullOrWhiteSpace($Key)) {
  $Key = Read-Host "Enter new OpenAI API key (sk-...)"
}

if ([string]::IsNullOrWhiteSpace($Key)) {
  Write-Host "No key entered. Aborted."
  exit 1
}

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $Key.Trim(), $enc)
Write-Host "API key saved to openai-api-key.txt"
