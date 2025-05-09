const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const requiredDependencies = {
  electron: '^34.0.0',
  i18next: '^24.2.1',
  'node-adodb': '^5.0.3',
};

function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ node_modules directory not found. Please run `npm install`.');
    process.exit(1);
  }
}

function checkDependency(dependency, version) {
  try {
    const installedVersion = require(path.join(__dirname, '..', 'node_modules', dependency, 'package.json')).version;

    // Simplified version comparison for the caret range
    const requiredMajorVersion = version.split('.')[0].replace('^', '');
    const installedMajorVersion = installedVersion.split('.')[0];

    if (requiredMajorVersion !== installedMajorVersion) {
      console.error(`❌ ${dependency} version mismatch. Installed: ${installedVersion}, Required: ${version}`);
      return false;
    }

    console.log(`✅ ${dependency} is installed (version: ${installedVersion})`);
    return true;
  } catch (e) {
    console.error(`❌ ${dependency} is not installed.`);
    return false;
  }
}

function checkNodeVersion() {
  const currentVersion = process.version;
  const requiredVersion = 'v18.0.0';

  if (currentVersion.localeCompare(requiredVersion, undefined, { numeric: true, sensitivity: 'base' }) < 0) {
    console.error(`❌ Node.js version ${currentVersion} is not supported. Please use version ${requiredVersion} or higher.`);
    return false;
  }
  console.log(`✅ Node.js version ${currentVersion} is supported.`);
  return true;
}

function main() {
  console.log('Checking dependencies...\n');

  if (!checkNodeVersion()) process.exit(1);

  checkNodeModules();

  let allDepsInstalled = true;
  for (const [dep, version] of Object.entries(requiredDependencies)) {
    if (!checkDependency(dep, version)) allDepsInstalled = false;
  }

  try {
    execSync('npm audit --production', { stdio: 'pipe' });
    console.log('✅ No security vulnerabilities found in production dependencies.');
  } catch (error) {
    console.warn('⚠️ Security vulnerabilities found. Run `npm audit` for details.');
  }

  if (!allDepsInstalled) {
    console.error('\n❌ Some dependencies are missing or incorrect. Please run `npm install` to resolve issues.');
    process.exit(1);
  }

  console.log('\n✅ All dependencies are properly installed and up-to-date!');
}

main();
