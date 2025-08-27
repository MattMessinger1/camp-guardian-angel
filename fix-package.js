const fs = require('fs');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Move @playwright/test from dependencies to devDependencies
if (packageJson.dependencies && packageJson.dependencies['@playwright/test']) {
  const playwrightVersion = packageJson.dependencies['@playwright/test'];
  delete packageJson.dependencies['@playwright/test'];
  
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  packageJson.devDependencies['@playwright/test'] = playwrightVersion;
  
  console.log('✅ Moved @playwright/test to devDependencies');
} else {
  console.log('❌ @playwright/test not found in dependencies');
}

// Write back to package.json
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ package.json updated');