// 连接 Figma MCP 频道的脚本
const WebSocket = require('ws');

const CHANNEL_ID = 'ovnjr9lc';
const WEBSOCKET_URL = 'ws://localhost:3055';

const ws = new WebSocket(WEBSOCKET_URL);

ws.on('open', function open() {
  console.log('连接到 WebSocket 服务器');
  
  // 发送加入频道的消息
  const joinMessage = {
    type: 'join',
    channel: CHANNEL_ID,
    id: 'figma-mcp-client-' + Date.now()
  };
  
  console.log('发送加入频道消息:', JSON.stringify(joinMessage, null, 2));
  ws.send(JSON.stringify(joinMessage));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('收到消息:', parsed);
    
    if (parsed.type === 'system' && typeof parsed.message === 'string' && parsed.message.includes('Joined channel')) {
      console.log('✅ 成功加入频道:', CHANNEL_ID);
      
      // 现在可以发送获取 Figma 设计稿的消息
      const figmaMessage = {
        type: 'message',
        channel: CHANNEL_ID,
        message: {
          action: 'get_figma_design',
          file_id: '3LtEHvWsvwMMG5jkAdhvqS',
          node_id: '0-1'
        }
      };
      
      console.log('发送 Figma 设计稿请求...');
      ws.send(JSON.stringify(figmaMessage));
    }
  } catch (error) {
    console.error('解析消息失败:', error);
    console.log('原始消息:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket 错误:', err);
});

ws.on('close', function close() {
  console.log('WebSocket 连接已关闭');
});

// 30秒后自动关闭
setTimeout(() => {
  console.log('30秒后自动关闭连接');
  ws.close();
}, 30000);