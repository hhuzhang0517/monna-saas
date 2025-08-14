// 探索 Figma 文件结构，找到正确的节点ID
const https = require('https');
const fs = require('fs');

const FIGMA_API_KEY = 'figd_-Borq4LQnbVBlxKqTLzryTZ45CyUD1Vpr0pWyrgt';
const FILE_ID = '3LtEHvWsvwMMG5jkAdhvqS';

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

// 递归显示节点结构
function displayNodeStructure(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const bbox = node.absoluteBoundingBox;
  const sizeInfo = bbox ? ` (${Math.round(bbox.width)}x${Math.round(bbox.height)})` : '';
  
  console.log(`${indent}📍 ${node.id} - ${node.name} (${node.type})${sizeInfo}`);
  
  if (node.children && depth < 3) { // 限制深度避免输出过多
    node.children.forEach(child => {
      displayNodeStructure(child, depth + 1);
    });
  } else if (node.children && node.children.length > 0) {
    console.log(`${indent}  ... ${node.children.length} 个子节点`);
  }
}

// 查找包含设计内容的主要节点
function findMainDesignNodes(node, nodes = []) {
  if (node.type === 'FRAME' && node.name && node.name.toLowerCase().includes('design')) {
    nodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
      childrenCount: node.children?.length || 0
    });
  }
  
  if (node.children) {
    node.children.forEach(child => {
      findMainDesignNodes(child, nodes);
    });
  }
  
  return nodes;
}

// 主执行函数
async function main() {
  try {
    console.log('🔍 探索 Figma 文件结构...');
    console.log(`📄 文件ID: ${FILE_ID}`);
    
    // 获取文件信息
    const fileData = await getFigmaFile();
    console.log(`📋 文件名称: ${fileData.name}`);
    console.log(`📅 最后修改: ${fileData.lastModified}`);
    
    console.log('\n🌳 文件结构:');
    displayNodeStructure(fileData.document);
    
    console.log('\n🎨 查找主要设计节点:');
    const designNodes = findMainDesignNodes(fileData.document);
    
    if (designNodes.length > 0) {
      designNodes.forEach((node, index) => {
        console.log(`  ${index + 1}. ID: ${node.id}`);
        console.log(`     名称: ${node.name}`);
        console.log(`     类型: ${node.type}`);
        console.log(`     尺寸: ${node.width}x${node.height}`);
        console.log(`     子节点: ${node.childrenCount}`);
        console.log('');
      });
      
      // 使用第一个设计节点
      const mainNode = designNodes[0];
      console.log(`🎯 建议使用节点: ${mainNode.id} (${mainNode.name})`);
      
      // 保存节点信息
      const nodeInfo = {
        fileId: FILE_ID,
        mainNodeId: mainNode.id,
        nodeName: mainNode.name,
        allDesignNodes: designNodes
      };
      
      fs.writeFileSync('figma-node-info.json', JSON.stringify(nodeInfo, null, 2));
      console.log('💾 节点信息已保存到 figma-node-info.json');
      
    } else {
      console.log('❌ 未找到包含 "design" 的主要节点');
      
      // 显示所有顶级节点
      console.log('\n📋 所有顶级节点:');
      if (fileData.document.children) {
        fileData.document.children.forEach((child, index) => {
          const bbox = child.absoluteBoundingBox;
          const sizeInfo = bbox ? ` (${Math.round(bbox.width)}x${Math.round(bbox.height)})` : '';
          console.log(`  ${index + 1}. ID: ${child.id} - ${child.name} (${child.type})${sizeInfo}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

main();