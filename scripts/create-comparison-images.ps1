# 创建AI生成后的对比图片（用于演示）

Write-Host "开始创建AI生成后的对比图片..." -ForegroundColor Green

$categories = @("portrait", "artistic", "anime")

foreach ($category in $categories) {
    $sourcePath = "public/figma-designs/$category"
    
    # 确保源目录存在
    if (Test-Path $sourcePath) {
        Write-Host "处理 $category 类别..." -ForegroundColor Yellow
        
        # 获取所有PNG图片
        $images = Get-ChildItem -Path $sourcePath -Filter "*.png" | Where-Object { $_.Name -notlike "*-after.png" }
        
        foreach ($image in $images) {
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($image.Name)
            $extension = $image.Extension
            $afterImageName = "$baseName-after$extension"
            $afterImagePath = Join-Path $sourcePath $afterImageName
            
            # 如果after图片不存在，复制原图作为after图片（实际项目中应该是真实的AI生成图片）
            if (-not (Test-Path $afterImagePath)) {
                Copy-Item $image.FullName $afterImagePath
                Write-Host "  创建了: $afterImageName" -ForegroundColor Cyan
            } else {
                Write-Host "  已存在: $afterImageName" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "目录不存在: $sourcePath" -ForegroundColor Red
    }
}

Write-Host "`n完成！所有AI生成后的对比图片已创建。" -ForegroundColor Green
Write-Host "注意：这些是演示用的占位图片。在实际应用中，应该使用真实的AI生成图片。" -ForegroundColor Yellow
