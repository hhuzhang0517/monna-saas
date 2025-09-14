# 长视频生成功能说明

## 功能概述

基于ChatGPT对话中的长视频生成方案，我们实现了一个完整的长视频生成系统，支持通过多张图片和文本描述生成连贯的长视频内容。

## 技术架构

### 1. API端点
- **POST /api/jobs/long-video**: 创建长视频生成任务
- **GET /api/jobs/long-video?jobId={id}**: 查询长视频生成进度

### 2. 核心组件
- **前端界面**: `app/generate/page.tsx` - 长视频生成界面
- **API处理**: `app/api/jobs/long-video/route.ts` - 长视频任务管理
- **视频生成**: `lib/providers/runway.ts` - Runway AI集成
- **进度显示**: `components/generation-modal.tsx` - 生成进度弹窗

### 3. 数据库架构
- **jobs表**: 添加了`metadata`字段存储长视频进度信息
- **type字段**: 支持新的`longvideo`类型

## 功能特性

### 1. 多图片上传
- 支持同时上传最多10张图片
- 支持JPG、PNG、WEBP格式
- 单个文件最大10MB
- 实时预览和删除功能

### 2. 智能分片处理
- 根据上传图片数量自动规划视频片段
- 每张图片生成5秒视频片段
- 无图片时根据文本长度生成2-6个片段

### 3. 视频合并策略
- 单个片段：直接返回
- 多个片段：使用video-to-video技术逐步融合
- 最终存储到专用目录：`long-video/{jobId}-final.mp4`

### 4. 实时进度跟踪
- 分析内容阶段：5%
- 生成片段阶段：10%-80%（根据片段数量分配）
- 合并视频阶段：85%-95%
- 完成阶段：100%

### 5. 用户界面
- ChatGPT风格的输入界面
- 图片拖拽预览
- 实时进度显示
- 详细状态信息

## 使用流程

### 1. 用户操作
1. 选择"长视频"生成类型
2. 输入视频描述文本
3. （可选）上传参考图片
4. 点击发送按钮开始生成

### 2. 系统处理
1. 上传图片到存储服务
2. 创建长视频生成任务
3. 分析内容并规划片段
4. 逐个生成视频片段
5. 合并所有片段
6. 返回最终视频URL

### 3. 进度反馈
- 实时显示当前步骤
- 百分比进度条
- 详细状态消息
- 错误处理和重试

## 技术实现细节

### 1. 分片算法
```typescript
// 规划视频片段
if (attachedImages.length > 0) {
  // 每张图片一个片段
  attachedImages.forEach((imageUrl, index) => {
    segments.push({
      id: `segment-${index + 1}`,
      prompt: `${prompt} - 第${index + 1}部分`,
      imageUrl,
      duration: 5,
      order: index + 1
    });
  });
} else {
  // 根据文本长度生成片段
  const segmentCount = Math.max(2, Math.min(6, Math.ceil(prompt.length / 100)));
}
```

### 2. 合并策略
```typescript
// 使用video-to-video逐步融合
let currentVideo = segments[0].videoUrl;
for (let i = 1; i < segments.length; i++) {
  const mergePrompt = `继续视频内容，融合以下场景: ${nextSegment.prompt}`;
  const mergedResult = await processVideoToVideo(currentVideo, mergePrompt, options);
  currentVideo = mergedResult.url;
}
```

### 3. 进度更新
```typescript
await onProgress?.({ 
  percentage: progressBase, 
  step: `生成片段 ${i + 1}/${totalSegments}`, 
  message: `正在生成第${i + 1}个视频片段...` 
});
```

## 配置要求

### 1. 环境变量
```bash
RUNWAY_API_KEY=your_runway_api_key
```

### 2. 数据库迁移
```sql
ALTER TABLE "jobs" ADD COLUMN "metadata" text;
```

### 3. 存储配置
- Supabase Storage配置
- CDN加速设置
- 文件大小限制

## 错误处理

### 1. 常见错误
- 图片上传失败：重试机制
- 视频生成超时：增加等待时间
- 合并失败：使用单个片段作为备选

### 2. 用户提示
- 友好的错误消息
- 具体的失败原因
- 建议的解决方案

## 性能优化

### 1. 并发控制
- 限制同时生成的任务数量
- 队列管理和优先级

### 2. 缓存策略
- 片段结果缓存
- 重复内容检测

### 3. 存储优化
- 压缩算法
- CDN分发
- 自动清理机制

## 未来扩展

### 1. 高级功能
- 自定义片段时长
- 音频同步
- 转场效果

### 2. 性能提升
- 并行片段生成
- 智能缓存
- 预处理优化

### 3. 用户体验
- 拖拽排序
- 实时预览
- 批量处理

## 监控和日志

### 1. 关键指标
- 生成成功率
- 平均处理时间
- 用户满意度

### 2. 日志记录
- 详细的处理步骤
- 错误堆栈信息
- 性能数据

### 3. 告警机制
- 失败率过高告警
- 处理时间过长告警
- 系统资源告警