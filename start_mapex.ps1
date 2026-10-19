# start_mapex.ps1 — Inicializador Inteligente do Mapex 3D & 2.5D
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Iniciando Mapex 3D & 2.5D..." -ForegroundColor Cyan

function Test-MapexServer {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", 3000)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

# 1. Se ja estiver rodando, abre direto o navegador
if (Test-MapexServer) {
    Write-Host "Servidor ja ativo na porta 3000! Abrindo navegador..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    exit 0
}

# 2. Localiza executavel
$antigravityExe = "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe"
$antigravityBinNode = "$env:APPDATA\Antigravity\bin\node.cmd"

# 3. Inicia o servidor Node/Electron em background independente
$started = $false
try {
    if (Test-Path $antigravityExe) {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $antigravityExe
        $psi.Arguments = "server.js"
        $psi.WorkingDirectory = $PSScriptRoot
        $psi.EnvironmentVariables["ELECTRON_RUN_AS_NODE"] = "1"
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($psi)
        $started = $true
    } elseif (Test-Path $antigravityBinNode) {
        Start-Process -FilePath $antigravityBinNode -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        $started = $true
    } else {
        Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        $started = $true
    }
} catch {
    Write-Host "Aviso: Falha ao invocar servidor em background: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Aguarda confirmacao de escuta na porta 3000 (ate 10 segundos)
$attempts = 0
$serverRunning = $false

while ($attempts -lt 25) {
    Start-Sleep -Milliseconds 400
    if (Test-MapexServer) {
        $serverRunning = $true
        break
    }
    $attempts++
}

# 5. Abre o navegador com certeza absoluta de funcionamento
if ($serverRunning) {
    Write-Host "Servidor Mapex pronto! Abrindo http://localhost:3000..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
} else {
    Write-Host "Abrindo modo visualizador direto (index.html) no navegador..." -ForegroundColor Yellow
    $indexPath = Join-Path $PSScriptRoot "index.html"
    Start-Process $indexPath
}
