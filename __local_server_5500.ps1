$prefix = "http://localhost:5500/"
$root = "C:\Users\sodaj\Desktop\교뵤 웹앱"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "LISTENING $prefix"
while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $reqPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($reqPath)) { $reqPath = "edu-ai-image-lab.html" }
    $fullPath = Join-Path $root $reqPath
    if (-not (Test-Path -LiteralPath $fullPath)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
      $context.Response.Close()
      continue
    }
    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = switch ($ext) {
      ".html" { "text/html; charset=utf-8" }
      ".js" { "text/javascript; charset=utf-8" }
      ".css" { "text/css; charset=utf-8" }
      ".png" { "image/png" }
      ".jpg" { "image/jpeg" }
      ".jpeg" { "image/jpeg" }
      ".webp" { "image/webp" }
      default { "application/octet-stream" }
    }
    $context.Response.ContentType = $contentType
    $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.ContentLength64 = $fileBytes.Length
    $context.Response.OutputStream.Write($fileBytes,0,$fileBytes.Length)
    $context.Response.Close()
  } catch {}
}