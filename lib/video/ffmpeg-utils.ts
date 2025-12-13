import { execa } from "execa";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import * as mime from "mime-types";

// 确保目录存在
export async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // 目录已存在时忽略错误
  }
}

// 提取视频最后一帧
export async function extractLastFrame(inputMp4: string, outPng?: string): Promise<string> {
  const outputPath = outPng || inputMp4.replace(/\.mp4$/, '_tail.png');
  await ensureDir(dirname(outputPath));
  
  console.log(`📸 Extracting last frame from ${inputMp4} to ${outputPath}`);
  
  try {
    // 使用-sseof从倒数3秒开始读取，-update 1只保留最后一帧
    await execa('ffmpeg', [
      '-y',
      '-sseof', '-3',
      '-i', inputMp4,
      '-update', '1',
      '-q:v', '2',
      outputPath
    ]);
    
    console.log(`✅ Last frame extracted: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error(`❌ Failed to extract last frame from ${inputMp4}:`, error);
    throw new Error(`视频尾帧提取失败: ${error.message}`);
  }
}

// 将文件转换为Data URI
export async function fileToDataUri(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const mimeType = mime.lookup(filePath) || 'image/png';
    
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`❌ Failed to convert file to data URI: ${filePath}`, error);
    throw new Error(`文件转换失败: ${error.message}`);
  }
}

// 下载文件
export async function downloadFile(url: string, outPath: string): Promise<string> {
  await ensureDir(dirname(outPath));
  
  console.log(`📥 Downloading ${url} to ${outPath}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outPath, buffer);
    
    console.log(`✅ Downloaded: ${outPath}`);
    return outPath;
    
  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error);
    throw new Error(`文件下载失败: ${error.message}`);
  }
}

// 使用concat demuxer无损拼接视频
export async function concatVideos(inputFiles: string[], outputPath: string): Promise<string> {
  await ensureDir(dirname(outputPath));
  
  console.log(`🔗 Concatenating ${inputFiles.length} videos to ${outputPath}`);
  
  try {
    // 创建文件列表
    const listFile = join(dirname(outputPath), `${randomUUID()}_files.txt`);
    const fileList = inputFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.writeFile(listFile, fileList, 'utf8');
    
    // 使用concat demuxer进行无损拼接
    await execa('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      outputPath
    ]);
    
    // 清理临时文件
    await fs.unlink(listFile).catch(() => {});
    
    console.log(`✅ Videos concatenated: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error(`❌ Failed to concatenate videos:`, error);
    throw new Error(`视频拼接失败: ${error.message}`);
  }
}

// 添加交叉淡化转场效果
export async function crossfadeVideos(
  video1: string, 
  video2: string, 
  outputPath: string, 
  fadeDuration: number = 1
): Promise<string> {
  await ensureDir(dirname(outputPath));
  
  console.log(`🎞️ Creating crossfade between ${video1} and ${video2}`);
  
  try {
    // 获取第一个视频的时长
    const probe = await execa('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      video1
    ]);
    
    const duration1 = parseFloat(probe.stdout);
    const offset = Math.max(0, duration1 - fadeDuration);
    
    await execa('ffmpeg', [
      '-y',
      '-i', video1,
      '-i', video2,
      '-filter_complex',
      `[0:v][1:v]xfade=transition=fade:offset=${offset}:duration=${fadeDuration}[v];[0:a][1:a]acrossfade=d=${fadeDuration}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'veryfast',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath
    ]);
    
    console.log(`✅ Crossfade created: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error(`❌ Failed to create crossfade:`, error);
    throw new Error(`转场效果创建失败: ${error.message}`);
  }
}

// 预处理图片（裁剪/补边到目标尺寸）
export async function preprocessImage({
  inputPath,
  outputPath,
  targetWidth,
  targetHeight,
  mode = "center_crop"
}: {
  inputPath: string;
  outputPath?: string;
  targetWidth: number;
  targetHeight: number;
  mode?: "center_crop" | "letterbox" | "fit";
}): Promise<string> {
  const output = outputPath || inputPath.replace(/\.[^.]+$/, '_processed.png');
  await ensureDir(dirname(output));
  
  console.log(`🖼️ Preprocessing image ${inputPath} to ${targetWidth}x${targetHeight} (${mode})`);
  
  try {
    let vf = "";
    if (mode === "center_crop") {
      // 先等比缩放，后中心裁剪到精确分辨率
      vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=cover,crop=${targetWidth}:${targetHeight}`;
    } else if (mode === "letterbox") {
      // 先等比缩放，后补边到目标分辨率
      vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black`;
    } else {
      // fit：仅缩放到最长边
      vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`;
    }

    await execa('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vf', vf,
      '-pix_fmt', 'rgb24',
      output
    ]);
    
    console.log(`✅ Image preprocessed: ${output}`);
    return output;
    
  } catch (error) {
    console.error(`❌ Failed to preprocess image:`, error);
    throw new Error(`图片预处理失败: ${error.message}`);
  }
}