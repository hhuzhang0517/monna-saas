// 获取 Figma 设计稿中所有独立组件的详细脚本
const https = require('https');
const fs = require('fs');

const FIGMA_API_KEY = 'figd_-Borq4LQnbVBlxKqTLzryTZ45CyUD1Vpr0pWyrgt';
const FILE_ID = '3LtEHvWsvwMMG5jkAdhvqS';
const NODE_ID = '49:95';

// 获取文件信息
async function getFigmaFile() {
  const options = {
    hostname: 'api.figma.com',
    port: 443,
    path: `/v1/files/${FILE_ID}`,
    method: 'GET',
    headers: {
      'X-Figma-Token': FIGMA_API_KEY
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 获取图片导出URL
async function getImageUrls(nodeIds) {
  const options = {
    hostname: 'api.figma.com',
    port: 443,
    path: `/v1/images/${FILE_ID}?ids=${nodeIds.join(',')}&format=png&scale=2`,
    method: 'GET',
    headers: {
      'X-Figma-Token': FIGMA_API_KEY
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 查找指定节点
function findTargetNode(node, targetId) {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findTargetNode(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

// 检查节点是否包含图片
function hasImage(node) {
  if (node.type === 'IMAGE') return true;
  if (node.fills) {
    return node.fills.some(fill => fill.type === 'IMAGE');
  }
  return false;
}

// 递归查找所有可能的图片组件
function findImageComponents(node, components = [], parentFrame = null) {
  // 检查当前节点是否是有意义的组件
  const isValidComponent = node.absoluteBoundingBox && 
                          node.absoluteBoundingBox.width > 50 && 
                          node.absoluteBoundingBox.height > 50;

  if (isValidComponent) {
    const isImage = hasImage(node);
    const hasVisibleContent = node.visible !== false && node.opacity !== 0;
    
    // 如果是图片或者是包含内容的矩形/框架
    if (isImage || node.type === 'RECTANGLE' || node.type === 'FRAME') {
      if (hasVisibleContent) {
        components.push({
          id: node.id,
          name: node.name || `${node.type}_${node.id.substring(0, 8)}`,
          type: node.type,
          x: node.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y,
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
          isImage: isImage,
          hasText: node.type === 'TEXT',
          fills: node.fills || [],
          parentFrame: parentFrame,
          // 计算相对于主框架的位置
          relativeX: parentFrame ? node.absoluteBoundingBox.x - parentFrame.x : node.absoluteBoundingBox.x,
          relativeY: parentFrame ? node.absoluteBoundingBox.y - parentFrame.y : node.absoluteBoundingBox.y
        });
      }
    }
  }
  
  // 递归查找子节点
  if (node.children) {
    const frameInfo = isValidComponent ? {
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height
    } : parentFrame;
    
    node.children.forEach(child => {
      findImageComponents(child, components, frameInfo);
    });
  }
  
  return components;
}

// 主执行函数
async function main() {
  try {
    console.log('🔍 正在获取 Figma 设计稿中的所有组件...');
    console.log(`📄 文件ID: ${FILE_ID}`);
    console.log(`🎯 节点ID: ${NODE_ID}`);
    
    // 获取文件信息
    const fileData = await getFigmaFile();
    console.log(`📋 文件名称: ${fileData.name}`);
    
    // 查找目标节点
    const targetNode = findTargetNode(fileData.document, NODE_ID);
    if (!targetNode) {
      console.log('❌ 未找到指定节点');
      return;
    }
    
    console.log(`🎯 主框架: ${targetNode.name} (${targetNode.type})`);
    console.log(`📐 尺寸: ${targetNode.absoluteBoundingBox.width}x${targetNode.absoluteBoundingBox.height}`);
    
    // 查找所有组件
    const allComponents = findImageComponents(targetNode);
    console.log(`\n🧩 发现 ${allComponents.length} 个组件:`);
    
    allComponents.forEach((comp, index) => {
      const icons = [];
      if (comp.isImage) icons.push('📷');
      if (comp.hasText) icons.push('📝');
      if (comp.type === 'RECTANGLE') icons.push('🔲');
      if (comp.type === 'FRAME') icons.push('🖼️');
      
      console.log(`  ${index + 1}. ${comp.name} (${comp.type}) - ${Math.round(comp.width)}x${Math.round(comp.height)} ${icons.join('')}`);
      console.log(`     位置: (${Math.round(comp.relativeX)}, ${Math.round(comp.relativeY)})`);
    });
    
    // 获取所有组件的导出链接
    const nodeIds = [NODE_ID, ...allComponents.map(comp => comp.id)];
    
    if (nodeIds.length > 0) {
      console.log('\n🎨 正在获取图片导出链接...');
      const imageData = await getImageUrls(nodeIds);
      
      if (imageData.images) {
        console.log('🖼️ 图片导出链接:');
        console.log(`  主设计稿: ${imageData.images[NODE_ID]}`);
        
        // 为每个组件添加图片URL
        const componentsWithImages = allComponents.map(comp => {
          const imageUrl = imageData.images[comp.id];
          if (imageUrl) {
            console.log(`  ${comp.name}: ${imageUrl}`);
          }
          return {
            ...comp,
            imageUrl: imageUrl || null
          };
        });
        
        // 保存结果到文件
        const result = {
          file: {
            id: FILE_ID,
            name: fileData.name,
            lastModified: fileData.lastModified
          },
          mainFrame: {
            id: targetNode.id,
            name: targetNode.name,
            type: targetNode.type,
            x: targetNode.absoluteBoundingBox.x,
            y: targetNode.absoluteBoundingBox.y,
            width: targetNode.absoluteBoundingBox.width,
            height: targetNode.absoluteBoundingBox.height,
            imageUrl: imageData.images[NODE_ID]
          },
          components: componentsWithImages
        };
        
        fs.writeFileSync('figma-components-data.json', JSON.stringify(result, null, 2));
        console.log('\n💾 组件数据已保存到 figma-components-data.json');
        
        // 生成可点击区域的代码
        generateClickableAreas(componentsWithImages, result.mainFrame);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

// 生成可点击区域的 TypeScript 代码
function generateClickableAreas(components, mainFrame) {
  console.log('\n🔧 生成可点击区域代码...');
  
  const clickableAreas = components
    .filter(comp => comp.imageUrl && (comp.isImage || comp.type === 'RECTANGLE'))
    .map((comp, index) => {
      return {
        id: `figma-${comp.type.toLowerCase()}-${index + 1}`,
        name: comp.name,
        image: "/figma-designs/generated-design.png", // 使用主设计稿
        category: comp.isImage ? "图片" : "设计",
        prompt: `${comp.name} style portrait, professional headshot, high quality`,
        x: comp.relativeX,
        y: comp.relativeY,
        width: comp.width,
        height: comp.height
      };
    });
  
  const code = `// 基于您的 Figma 设计稿自动生成的可点击区域
const FIGMA_CLICKABLE_AREAS: FigmaTemplate[] = [
${clickableAreas.map(area => `  {
    id: "${area.id}",
    name: "${area.name}",
    image: "${area.image}",
    category: "${area.category}",
    prompt: "${area.prompt}",
    x: ${Math.round(area.x)},
    y: ${Math.round(area.y)},
    width: ${Math.round(area.width)},
    height: ${Math.round(area.height)}
  }`).join(',\n')}
];

// 主设计稿尺寸: ${mainFrame.width}x${mainFrame.height}`;
  
  fs.writeFileSync('figma-clickable-areas.ts', code);
  console.log('📝 可点击区域代码已保存到 figma-clickable-areas.ts');
}

main();