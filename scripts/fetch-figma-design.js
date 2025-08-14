// 直接从 Figma API 获取设计稿的脚本
const https = require('https');
const fs = require('fs');

const FIGMA_API_KEY = 'figd_-Borq4LQnbVBlxKqTLzryTZ45CyUD1Vpr0pWyrgt';
const FILE_ID = '3LtEHvWsvwMMG5jkAdhvqS';
const NODE_ID = '0-1';

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

// 获取特定节点信息
async function getFigmaNodes(nodeIds) {
  const options = {
    hostname: 'api.figma.com',
    port: 443,
    path: `/v1/files/${FILE_ID}/nodes?ids=${nodeIds.join(',')}`,
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

// 递归查找所有组件和帧
function findComponents(node, components = []) {
  if (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'GROUP') {
    components.push({
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.absoluteBoundingBox?.x,
      y: node.absoluteBoundingBox?.y,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height
    });
  }
  
  if (node.children) {
    node.children.forEach(child => {
      findComponents(child, components);
    });
  }
  
  return components;
}

// 主执行函数
async function main() {
  try {
    console.log('🔍 正在获取 Figma 设计稿信息...');
    console.log(`📄 文件ID: ${FILE_ID}`);
    console.log(`🎯 节点ID: ${NODE_ID}`);
    
    // 获取文件信息
    const fileData = await getFigmaFile();
    console.log(`📋 文件名称: ${fileData.name}`);
    console.log(`👤 创建者: ${fileData.document.name}`);
    
    // 查找所有组件
    const allComponents = findComponents(fileData.document);
    console.log(`🧩 找到 ${allComponents.length} 个组件/帧:`);
    
    allComponents.forEach((comp, index) => {
      console.log(`  ${index + 1}. ${comp.name} (${comp.type}) - ${comp.width}x${comp.height}`);
    });
    
    // 获取前10个组件的节点ID（避免API限制）
    const topComponents = allComponents.slice(0, 10);
    const nodeIds = topComponents.map(comp => comp.id);
    
    if (nodeIds.length > 0) {
      console.log('\\n🎨 正在获取图片导出链接...');
      const imageData = await getImageUrls(nodeIds);
      
      if (imageData.images) {
        console.log('🖼️ 图片导出链接:');
        Object.entries(imageData.images).forEach(([nodeId, url]) => {
          const component = topComponents.find(c => c.id === nodeId);
          console.log(`  ${component?.name}: ${url}`);
        });
        
        // 保存结果到文件
        const result = {
          file: {
            id: FILE_ID,
            name: fileData.name,
            lastModified: fileData.lastModified
          },
          components: topComponents.map(comp => ({
            ...comp,
            imageUrl: imageData.images[comp.id]
          }))
        };
        
        fs.writeFileSync('figma-design-data.json', JSON.stringify(result, null, 2));
        console.log('\\n💾 设计稿数据已保存到 figma-design-data.json');
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('响应:', error.response);
    }
  }
}

main();