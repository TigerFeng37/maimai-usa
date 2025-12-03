#!/usr/bin/env node
/**
 * 生产环境部署前检查脚本
 * 运行: node scripts/pre-deploy-check.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const checks = [];
const errors = [];
const warnings = [];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(name, condition, errorMsg, warningMsg = null) {
  if (condition) {
    checks.push({ name, status: '✅', message: '通过' });
    log(`✅ ${name}`, 'green');
  } else {
    if (errorMsg) {
      errors.push({ name, message: errorMsg });
      log(`❌ ${name}: ${errorMsg}`, 'red');
    } else if (warningMsg) {
      warnings.push({ name, message: warningMsg });
      log(`⚠️  ${name}: ${warningMsg}`, 'yellow');
    }
    checks.push({ name, status: '❌', message: errorMsg || warningMsg });
  }
}

log('\n🔍 开始生产环境部署前检查...\n', 'cyan');

// 1. 检查 .gitignore
log('📋 检查 .gitignore 配置...', 'blue');
const gitignorePath = path.join(rootDir, '.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath) 
  ? fs.readFileSync(gitignorePath, 'utf-8') 
  : '';

check(
  '.env 在 .gitignore 中',
  gitignoreContent.includes('.env'),
  '.env 文件未在 .gitignore 中，可能导致敏感信息泄露！'
);

check(
  '.env.production 在 .gitignore 中',
  gitignoreContent.includes('.env.production') || gitignoreContent.includes('.env.*'),
  '.env.production 未在 .gitignore 中'
);

check(
  'server/data/ 在 .gitignore 中',
  gitignoreContent.includes('server/data/'),
  'server/data/ 未在 .gitignore 中'
);

// 2. 检查是否有 .env 文件被跟踪
log('\n🔒 检查敏感文件...', 'blue');
try {
  const trackedEnvFiles = execSync('git ls-files | grep -E "\\.env$|\\.env\\."', { 
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  }).trim();
  
  check(
    '没有 .env 文件被 Git 跟踪',
    !trackedEnvFiles,
    `发现被跟踪的 .env 文件：\n${trackedEnvFiles}`
  );
} catch (e) {
  // 如果没有找到文件，exit code 不为 0，这是正常的
  check('没有 .env 文件被 Git 跟踪', true);
}

// 3. 检查代码中的默认 SESSION_SECRET
log('\n🔐 检查代码安全性...', 'blue');
const serverIndexPath = path.join(rootDir, 'server', 'index.js');
if (fs.existsSync(serverIndexPath)) {
  const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf-8');
  const hasDefaultSecret = serverIndexContent.includes("'your-secret-key-change-this-in-production'");
  
  check(
    'SESSION_SECRET 使用环境变量',
    serverIndexContent.includes('process.env.SESSION_SECRET'),
    'SESSION_SECRET 未使用环境变量',
    hasDefaultSecret ? '代码中有默认的 SESSION_SECRET，生产环境必须设置环境变量！' : null
  );
}

// 4. 检查 GitHub Actions 工作流
log('\n⚙️  检查 GitHub Actions 配置...', 'blue');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'update-locations.yml');
if (fs.existsSync(workflowPath)) {
  const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
  
  check(
    '工作流需要 CLOUDFLARE_API_TOKEN',
    workflowContent.includes('CLOUDFLARE_API_TOKEN'),
    '工作流需要 CLOUDFLARE_API_TOKEN secret'
  );
  
  check(
    '工作流需要 CLOUDFLARE_ACCOUNT_ID',
    workflowContent.includes('CLOUDFLARE_ACCOUNT_ID'),
    '工作流需要 CLOUDFLARE_ACCOUNT_ID secret'
  );
  
  check(
    '工作流需要 CLOUDFLARE_PROJECT_NAME',
    workflowContent.includes('CLOUDFLARE_PROJECT_NAME'),
    '工作流需要 CLOUDFLARE_PROJECT_NAME secret'
  );
  
  check(
    '工作流有 contents: write 权限',
    workflowContent.includes('contents: write'),
    '工作流需要 contents: write 权限以自动提交更改'
  );
}

// 5. 检查未提交的文件
log('\n📁 检查 Git 状态...', 'blue');
try {
  const gitStatus = execSync('git status --short', { 
    encoding: 'utf-8',
    cwd: rootDir 
  });
  
  const untrackedFiles = gitStatus
    .split('\n')
    .filter(line => line.startsWith('??'))
    .map(line => line.substring(3))
    .filter(Boolean);
  
  const modifiedFiles = gitStatus
    .split('\n')
    .filter(line => line.startsWith(' M'))
    .map(line => line.substring(3))
    .filter(Boolean);
  
  if (untrackedFiles.length > 0) {
    log(`\n⚠️  发现 ${untrackedFiles.length} 个未跟踪的文件：`, 'yellow');
    untrackedFiles.forEach(file => {
      log(`   - ${file}`, 'yellow');
    });
    warnings.push({
      name: '未跟踪的文件',
      message: `有 ${untrackedFiles.length} 个未跟踪的文件，请确认是否需要提交`
    });
  }
  
  if (modifiedFiles.length > 0) {
    log(`\n📝 发现 ${modifiedFiles.length} 个已修改的文件：`, 'blue');
    modifiedFiles.forEach(file => {
      log(`   - ${file}`, 'blue');
    });
  }
  
  check(
    'Git 状态正常',
    true,
    null,
    untrackedFiles.length > 0 ? `有 ${untrackedFiles.length} 个未跟踪的文件` : null
  );
} catch (e) {
  warnings.push({ name: 'Git 状态检查', message: '无法检查 Git 状态' });
}

// 6. 检查 package.json 脚本
log('\n📦 检查构建配置...', 'blue');
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  check(
    '有 build 脚本',
    packageJson.scripts && packageJson.scripts.build,
    'package.json 中缺少 build 脚本'
  );
  
  check(
    '有 server 脚本',
    packageJson.scripts && packageJson.scripts.server,
    'package.json 中缺少 server 脚本'
  );
}

// 7. 检查 vite.config.js
log('\n🏗️  检查 Vite 配置...', 'blue');
const viteConfigPath = path.join(rootDir, 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8');
  
  check(
    'Vite 配置存在',
    true,
    null,
    null
  );
}

// 总结
log('\n' + '='.repeat(60), 'cyan');
log('📊 检查总结', 'cyan');
log('='.repeat(60), 'cyan');

const totalChecks = checks.length;
const passedChecks = checks.filter(c => c.status === '✅').length;
const failedChecks = errors.length;
const warningCount = warnings.length;

log(`\n总检查项: ${totalChecks}`, 'blue');
log(`✅ 通过: ${passedChecks}`, 'green');
log(`❌ 错误: ${failedChecks}`, failedChecks > 0 ? 'red' : 'green');
log(`⚠️  警告: ${warningCount}`, warningCount > 0 ? 'yellow' : 'green');

if (errors.length > 0) {
  log('\n❌ 发现以下错误，必须修复：', 'red');
  errors.forEach((error, index) => {
    log(`  ${index + 1}. ${error.name}: ${error.message}`, 'red');
  });
}

if (warnings.length > 0) {
  log('\n⚠️  发现以下警告，建议检查：', 'yellow');
  warnings.forEach((warning, index) => {
    log(`  ${index + 1}. ${warning.name}: ${warning.message}`, 'yellow');
  });
}

if (errors.length === 0 && warnings.length === 0) {
  log('\n🎉 所有检查通过！可以安全地推送到 GitHub。', 'green');
} else if (errors.length === 0) {
  log('\n✅ 没有严重错误，但建议处理上述警告。', 'green');
} else {
  log('\n🚨 发现严重错误，请修复后再推送！', 'red');
  process.exit(1);
}

log('\n📚 更多信息请查看: PRE_DEPLOYMENT_CHECKLIST.md\n', 'cyan');

