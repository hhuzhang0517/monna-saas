param(
    [Parameter(Mandatory=$true)]
    [string]$InputVideo,
    [Parameter(Mandatory=$false)]
    [string]$OutputImage = ""
)

# 函数：检查 FFmpeg 是否可用
function Test-FFmpeg {
    try {
        $null = ffmpeg -version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# 函数：提取视频首帧
function Extract-FirstFrame {
    param(
        [string]$VideoPath,
        [string]$ImagePath
    )
    
    Write-Host "🎬 正在提取视频首帧..." -ForegroundColor Green
    Write-Host "输入视频: $VideoPath" -ForegroundColor Cyan
    Write-Host "输出图片: $ImagePath" -ForegroundColor Cyan
    
    try {
        # 使用 FFmpeg 提取第一帧
        $ffmpegArgs = @(
            "-i", $VideoPath,
            "-vframes", "1",
            "-f", "image2",
            "-y",  # 覆盖输出文件
            $ImagePath
        )
        
        $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ 视频首帧提取成功！" -ForegroundColor Green
            Write-Host "输出文件: $ImagePath" -ForegroundColor Yellow
            
            # 显示文件信息
            if (Test-Path $ImagePath) {
                $fileInfo = Get-Item $ImagePath
                Write-Host "文件大小: $([math]::Round($fileInfo.Length/1KB, 2)) KB" -ForegroundColor Gray
            }
        } else {
            Write-Host "❌ FFmpeg 执行失败，退出代码: $($process.ExitCode)" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "❌ 执行过程中出现错误: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 主程序
Write-Host "=== 视频首帧提取工具 ===" -ForegroundColor Magenta
Write-Host ""

# 检查 FFmpeg 是否安装
if (-not (Test-FFmpeg)) {
    Write-Host "❌ 错误: 未找到 FFmpeg" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 FFmpeg:" -ForegroundColor Yellow
    Write-Host "1. 通过 Chocolatey: choco install ffmpeg" -ForegroundColor Cyan
    Write-Host "2. 通过 Winget: winget install Gyan.FFmpeg" -ForegroundColor Cyan
    Write-Host "3. 或从官网下载: https://ffmpeg.org/download.html" -ForegroundColor Cyan
    exit 1
}

# 验证输入文件
if (-not (Test-Path $InputVideo)) {
    Write-Host "❌ 错误: 输入视频文件不存在: $InputVideo" -ForegroundColor Red
    exit 1
}

# 检查文件扩展名
$inputExt = [System.IO.Path]::GetExtension($InputVideo).ToLower()
$supportedFormats = @(".mp4", ".avi", ".mov", ".mkv", ".flv", ".wmv", ".webm")

if ($inputExt -notin $supportedFormats) {
    Write-Host "❌ 错误: 不支持的视频格式: $inputExt" -ForegroundColor Red
    Write-Host "支持的格式: $($supportedFormats -join ', ')" -ForegroundColor Yellow
    exit 1
}

# 生成输出文件名
if ($OutputImage -eq "") {
    $inputBaseName = [System.IO.Path]::GetFileNameWithoutExtension($InputVideo)
    $inputDir = [System.IO.Path]::GetDirectoryName($InputVideo)
    $OutputImage = Join-Path $inputDir "$inputBaseName-frame1.png"
}

# 确保输出目录存在
$outputDir = [System.IO.Path]::GetDirectoryName($OutputImage)
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# 执行提取
Extract-FirstFrame -VideoPath $InputVideo -ImagePath $OutputImage

Write-Host ""
Write-Host "操作完成！" -ForegroundColor Green