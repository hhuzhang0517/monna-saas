#!/usr/bin/env node

/**
 * Inngest 配置检查脚本
 *
 * 用于验证 Inngest 相关的环境变量是否正确配置
 */

const chalk = require('chalk');

console.log(chalk.blue.bold('\n🔍 检查 Inngest 配置...\n'));

const checks = [
  {
    name: 'INNGEST_EVENT_KEY',
    required: true,
    description: '用于发送事件到 Inngest Cloud',
    expectedPrefix: 'evt_'
  },
  {
    name: 'INNGEST_SIGNING_KEY',
    required: true,
    description: '用于验证 Inngest webhook 请求',
    expectedPrefix: 'signkey-'
  },
  {
    name: 'NEXT_PUBLIC_INNGEST_DEV',
    required: false,
    description: '开发环境标志（可选）'
  }
];

let allPassed = true;

checks.forEach(check => {
  const value = process.env[check.name];
  const exists = !!value;

  if (exists) {
    const masked = value.substring(0, 10) + '...';

    // 检查密钥格式
    if (check.expectedPrefix && !value.startsWith(check.expectedPrefix)) {
      console.log(
        chalk.yellow('⚠️'),
        chalk.bold(check.name.padEnd(30)),
        chalk.yellow(masked)
      );
      console.log(chalk.yellow(`   格式警告: 应该以 "${check.expectedPrefix}" 开头`));
      console.log(chalk.gray('   ' + check.description));
      if (check.required) allPassed = false;
    } else {
      console.log(
        chalk.green('✅'),
        chalk.bold(check.name.padEnd(30)),
        chalk.gray(masked)
      );
      console.log(chalk.gray('   ' + check.description));
    }
  } else {
    if (check.required) {
      console.log(
        chalk.red('❌'),
        chalk.bold(check.name.padEnd(30)),
        chalk.red('未设置')
      );
      console.log(chalk.gray('   ' + check.description));
      allPassed = false;
    } else {
      console.log(
        chalk.yellow('⚠️'),
        chalk.bold(check.name.padEnd(30)),
        chalk.yellow('未设置（可选）')
      );
      console.log(chalk.gray('   ' + check.description));
    }
  }
  console.log();
});

console.log(chalk.blue('─'.repeat(60)));

if (allPassed) {
  console.log(chalk.green.bold('\n✅ 所有必需的环境变量都已配置！\n'));
  console.log(chalk.gray('下一步：'));
  console.log(chalk.gray('1. 在 Inngest Cloud 配置 webhook'));
  console.log(chalk.gray('2. Webhook URL: https://your-domain.com/api/inngest'));
  console.log(chalk.gray('3. 重新部署应用\n'));
  process.exit(0);
} else {
  console.log(chalk.red.bold('\n❌ 缺少必需的环境变量！\n'));
  console.log(chalk.yellow('请按以下步骤配置：\n'));
  console.log(chalk.gray('开发环境 (.env.local):'));
  console.log(chalk.gray('  1. 复制 .env.example 到 .env.local'));
  console.log(chalk.gray('  2. 填写 Inngest API keys\n'));
  console.log(chalk.gray('生产环境 (Vercel):'));
  console.log(chalk.gray('  1. 访问 Vercel Dashboard → Settings → Environment Variables'));
  console.log(chalk.gray('  2. 添加 INNGEST_EVENT_KEY 和 INNGEST_SIGNING_KEY'));
  console.log(chalk.gray('  3. 确保为所有环境（Production, Preview, Development）都配置\n'));
  console.log(chalk.gray('详细说明请参考: INNGEST_DEPLOYMENT_GUIDE.md\n'));
  process.exit(1);
}
