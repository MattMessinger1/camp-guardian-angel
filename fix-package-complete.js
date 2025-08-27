const fs = require('fs');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log('🔍 Checking for problematic dependencies...');

// Remove vitest from dependencies (this is the real culprit!)
if (packageJson.dependencies && packageJson.dependencies['vitest']) {
  const vitestVersion = packageJson.dependencies['vitest'];
  delete packageJson.dependencies['vitest'];
  console.log('✅ Removed vitest from dependencies:', vitestVersion);
} else {
  console.log('❌ vitest not found in dependencies');
}

// Ensure @playwright/test is in devDependencies
if (packageJson.dependencies && packageJson.dependencies['@playwright/test']) {
  const playwrightVersion = packageJson.dependencies['@playwright/test'];
  delete packageJson.dependencies['@playwright/test'];
  
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  packageJson.devDependencies['@playwright/test'] = playwrightVersion;
  console.log('✅ Moved @playwright/test to devDependencies');
}

// Write back to package.json with proper formatting
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ package.json updated and formatted correctly');