# Generates public/og.png (1200x630) in the design.md palette.
# Pixel wordmark is drawn small and upscaled with nearest-neighbor — honest aliasing.
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "public\og.png"

$bg     = [System.Drawing.ColorTranslator]::FromHtml('#100F0D')
$bone   = [System.Drawing.ColorTranslator]::FromHtml('#EDE6D8')
$soft   = [System.Drawing.ColorTranslator]::FromHtml('#CFC7B8')
$muted  = [System.Drawing.ColorTranslator]::FromHtml('#948C7C')
$amber  = [System.Drawing.ColorTranslator]::FromHtml('#FFB000')
$line   = [System.Drawing.ColorTranslator]::FromHtml('#221F19')

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear($bg)

# faint grid
$gridPen = New-Object System.Drawing.Pen($line)
for ($x = 0; $x -le $W; $x += 80) { $g.DrawLine($gridPen, $x, 0, $x, $H) }
for ($y = 0; $y -le $H; $y += 80) { $g.DrawLine($gridPen, 0, $y, $W, $y) }

$fmt = [System.Drawing.StringFormat]::GenericTypographic
$mid = [string][char]0x00B7   # ·
$dash = [string][char]0x2014  # —
$boneBrush  = New-Object System.Drawing.SolidBrush($bone)
$softBrush  = New-Object System.Drawing.SolidBrush($soft)
$mutedBrush = New-Object System.Drawing.SolidBrush($muted)
$amberBrush = New-Object System.Drawing.SolidBrush($amber)

# --- pixel wordmark: draw small, upscale 6x nearest-neighbor ---
$sw = 260; $sh = 70
$small = New-Object System.Drawing.Bitmap($sw, $sh)
$sg = [System.Drawing.Graphics]::FromImage($small)
$sg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
$pixFont = New-Object System.Drawing.Font('Consolas', 52, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$cellW = $sg.MeasureString('CELL', $pixFont, [System.Drawing.PointF]::new(0,0), $fmt).Width
$sg.DrawString('CELL', $pixFont, $boneBrush, 0, 0, $fmt)
$sg.DrawString('O', $pixFont, $amberBrush, ($cellW - 4), 0, $fmt)
$sg.Dispose()

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$scale = 5
$g.DrawImage($small, 54, 165, $sw * $scale, $sh * $scale)

# --- text ---
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$monoS  = New-Object System.Drawing.Font('Consolas', 19, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$monoM  = New-Object System.Drawing.Font('Consolas', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$nameF  = New-Object System.Drawing.Font('Segoe UI', 36, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$g.DrawString("MRL-2026 $mid PORTFOLIO $mid SYS.OK", $monoS, $mutedBrush, 60, 52, $fmt)
$g.DrawString('LOCAL GMT-3', $monoS, $mutedBrush, 1010, 52, $fmt)
$g.DrawString('MARCELO RIBEIRO LIMA', $nameF, $boneBrush, 58, 464, $fmt)
$g.DrawString("AUTOMATION & INTEGRATION DEVELOPER $dash n8n $mid PYTHON $mid AI AGENTS", $monoM, $amberBrush, 60, 518, $fmt)
$g.DrawString("LAT -22.8837 $mid LON -48.4437 $mid BOTUCATU SP BR $mid OPEN_TO_REMOTE", $monoS, $mutedBrush, 60, 560, $fmt)

# --- amber corner brackets ---
$bracket = New-Object System.Drawing.Pen($amber, 3)
$g.DrawLine($bracket, 24, 24, 60, 24);  $g.DrawLine($bracket, 24, 24, 24, 60)
$g.DrawLine($bracket, $W-24, $H-24, $W-60, $H-24); $g.DrawLine($bracket, $W-24, $H-24, $W-24, $H-60)

# --- dithered band, bottom edge: 25/50/75% coverage checker, 8px cells ---
$ditherBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, $amber))
for ($band = 0; $band -lt 3; $band++) {
  $coverage = @(1, 2, 3)[$band]   # of 4 sub-cells
  $yStart = $H - 24 + ($band * 8)
  for ($x = 0; $x -lt $W; $x += 8) {
    for ($i = 0; $i -lt $coverage; $i++) {
      $sub = @(@(0,0), @(4,4), @(4,0))[$i]
      $g.FillRectangle($ditherBrush, $x + $sub[0], $yStart + $sub[1], 4, 4)
    }
  }
}

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "wrote $out"
