$path = "src\routes\_authenticated\dashboard.tsx"

$content = Get-Content $path -Raw

# Replace the card class
$old = 'className={`hud-panel corner-brackets p-5 ${c.accent ? "border-primary/60" : ""}`}'
$new = @'
className={`
  hud-panel
  corner-brackets
  group
  relative
  overflow-visible
  p-5
  transition-all
  duration-300
  ease-out
  hover:-translate-y-2
  hover:scale-[1.03]
  hover:border-primary
  hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]
  active:-translate-y-1
  active:scale-[1.02]
  ${c.accent ? "border-primary/60" : ""}
`}
'@

$content = $content.Replace($old, $new)

# Insert the underglow div immediately after the opening card tag
$pattern = '(>\s*\r?\n\s*)(<p className="mono text-\[10px\] uppercase tracking-widest text-muted-foreground">)'

$insert = @'
>

            <div
              className="
                pointer-events-none
                absolute
                left-8
                right-8
                -bottom-4
                h-6
                rounded-full
                bg-blue-500/40
                blur-2xl
                opacity-0
                transition-opacity
                duration-300
                group-hover:opacity-100
                group-active:opacity-100
              "
            />

            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
'@

$content = [regex]::Replace($content, $pattern, $insert, 1)

# Enhance number animation
$content = $content.Replace(
'className={`mono mt-2 text-3xl font-bold ${c.accent ? "text-primary hud-glow" : "text-foreground"}`}',
@'
className={`
mono
mt-2
text-3xl
font-bold
transition-all
duration-300
group-hover:tracking-wider
group-hover:text-cyan-300
${c.accent ? "text-primary hud-glow" : "text-foreground"}
`}
'@
)

Set-Content -Path $path -Value $content -Encoding UTF8

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Dashboard hover effects installed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan