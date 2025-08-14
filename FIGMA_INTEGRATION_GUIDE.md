# Figma 设计集成指南

## 当前状态

我已经根据您描述的功能需求创建了一个完整的AI头像生成应用，包含：

### ✅ 已实现的功能

1. **模板画廊页面** (`components/template-gallery.tsx`)
   - 多种风格模板（商务、艺术、时尚、休闲、复古、创意）
   - 分类筛选功能
   - 模板选择和预览
   - 响应式网格布局

2. **图片上传组件** (`components/ui/image-upload.tsx`)
   - 拖拽上传功能
   - 文件类型验证
   - 图片预览
   - 清除功能

3. **生成进度弹窗** (`components/generation-modal.tsx`)
   - 实时状态监控
   - 进度条显示
   - 结果展示
   - 下载和分享功能

4. **主页面** (`app/generate/page.tsx`)
   - 完整的用户界面
   - AI引擎选择
   - 生成流程管理

5. **首页** (`app/page.tsx`)
   - 产品介绍
   - 功能特性展示
   - 使用流程说明

## Figma 设计集成步骤

### 方法1：使用 Cursor Talk to Figma

您提到了 "cursor Talk to Figma的channel号是90n87lg2"，这可能是一个特定的集成通道。要使用此功能：

1. **在 Cursor 中启用 Figma 集成**：
   ```
   在 Cursor 设置中搜索 "Figma"
   输入您的 channel 号：90n87lg2
   连接到 Figma 设计稿
   ```

2. **导入设计组件**：
   ```
   使用 @figma 命令引用设计
   让 Cursor 分析 Figma 设计稿
   生成对应的 React 组件代码
   ```

### 方法2：手动集成 Figma 设计

如果无法直接访问 Figma 设计稿，可以通过以下方式集成：

#### 1. 获取设计资产
```bash
# 从 Figma 导出图片资产
- 导出模板示例图片 (JPG/PNG)
- 导出图标和装饰元素
- 获取设计规范（颜色、字体、间距）
```

#### 2. 更新模板数据
修改 `components/template-gallery.tsx` 中的 `TEMPLATES` 数组：

```typescript
const TEMPLATES: Template[] = [
  {
    id: "1",
    name: "专业商务头像",
    image: "/templates/business-professional.jpg", // 替换为实际Figma导出的图片
    category: "商务",
    prompt: "professional business headshot, corporate style...",
    featured: true
  },
  // 添加更多从 Figma 设计的模板
];
```

#### 3. 应用设计系统
在 `tailwind.config.js` 中添加 Figma 设计的颜色和字体：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // 从 Figma 复制的品牌色彩
        'brand-primary': '#your-primary-color',
        'brand-secondary': '#your-secondary-color',
      },
      fontFamily: {
        // 从 Figma 使用的字体
        'brand': ['Your-Font-Family', 'sans-serif'],
      },
    },
  },
};
```

### 方法3：使用 Figma Dev Mode

1. **在 Figma 中启用 Dev Mode**
2. **选择组件并复制 CSS/React 代码**
3. **将代码适配到现有组件结构**

## 当前设计特点

目前实现的设计包含：

- **现代渐变背景**：紫色到蓝色的渐变
- **卡片式布局**：清晰的信息层次
- **响应式设计**：支持移动端和桌面端
- **交互反馈**：悬停效果和选中状态
- **品牌色彩**：紫色/蓝色主题

## 需要从 Figma 获取的资产

### 图片资产
```
/public/templates/
├── business-1.jpg          # 商务模板示例
├── artistic-1.jpg          # 艺术模板示例
├── fashion-1.jpg          # 时尚模板示例
├── casual-1.jpg           # 休闲模板示例
├── vintage-1.jpg          # 复古模板示例
└── creative-1.jpg         # 创意模板示例
```

### 设计规范
- **主色调**：从 Figma 获取准确的十六进制色值
- **字体**：确认使用的字体族
- **间距**：组件间距和内边距规范
- **圆角**：按钮和卡片的圆角大小
- **阴影**：卡片和按钮的阴影效果

## 后续优化建议

1. **性能优化**：
   - 添加图片懒加载
   - 优化模板图片大小
   - 使用 Next.js Image 组件

2. **用户体验**：
   - 添加加载骨架屏
   - 优化移动端交互
   - 添加键盘导航支持

3. **可访问性**：
   - 添加 alt 文本
   - 确保对比度符合标准
   - 支持屏幕阅读器

## 测试建议

在应用 Figma 设计后，建议测试：

- [ ] 模板选择功能
- [ ] 图片上传流程
- [ ] 生成进度显示
- [ ] 移动端响应式
- [ ] 浏览器兼容性

## 联系支持

如果在集成过程中遇到问题：

1. 检查 Figma 链接权限
2. 确认 Cursor 的 Figma 集成配置
3. 验证设计稿的导出设置
4. 查看 Console 中的错误信息

---

**注意**: 当前实现已经包含了完整的功能框架，只需要替换模板图片和调整设计细节即可与您的 Figma 设计完全匹配。