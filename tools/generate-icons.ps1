param(
  [string]$Source = "images/52logo.png",
  [string]$OutputDir = "images/icons"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path (Get-Location) $Source
$outputPath = Join-Path (Get-Location) $OutputDir

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Source image not found: $sourcePath"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

function Save-Icon {
  param(
    [System.Drawing.Image]$SourceImage,
    [int]$Size,
    [string]$FileName,
    [double]$Scale = 1.0
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::White)

  $drawSize = [Math]::Round($Size * $Scale)
  $offset = [Math]::Round(($Size - $drawSize) / 2)
  $targetRect = New-Object System.Drawing.Rectangle $offset, $offset, $drawSize, $drawSize
  $graphics.DrawImage($SourceImage, $targetRect)

  $filePath = Join-Path $outputPath $FileName
  $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
  Save-Icon -SourceImage $sourceImage -Size 180 -FileName "apple-touch-icon.png" -Scale 1.0
  Save-Icon -SourceImage $sourceImage -Size 192 -FileName "icon-192.png" -Scale 1.0
  Save-Icon -SourceImage $sourceImage -Size 512 -FileName "icon-512.png" -Scale 1.0
  Save-Icon -SourceImage $sourceImage -Size 512 -FileName "icon-maskable-512.png" -Scale 0.82
} finally {
  $sourceImage.Dispose()
}

Write-Output "Generated app icons in $outputPath"
