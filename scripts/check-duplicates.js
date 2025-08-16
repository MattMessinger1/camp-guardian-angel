#!/usr/bin/env node

/**
 * Pre-commit script to prevent duplicate helpers/components
 * Checks for fuzzy name matches and identical export symbols
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Known helpers that should not be duplicated
const KNOWN_HELPERS = {
  fetch: ['fetch', 'fetcher', 'fetchData', 'fetchHtml', 'httpFetch', 'dataFetch'],
  extract: ['extract', 'extractor', 'extraction', 'parse', 'parser'],
  logger: ['log', 'logger', 'logging', 'audit'],
  session: ['session', 'sessions', 'sessionData', 'sessionExtraction'],
  robots: ['robots', 'robotsChecker', 'robotsTxt'],
  rateLimiter: ['rateLimit', 'rateLimiter', 'throttle', 'throttler'],
  card: ['card', 'cardComponent', 'cardUI'],
  env: ['env', 'environment', 'config', 'configuration']
};

function fuzzyMatch(name1, name2) {
  // Convert to lowercase and remove common suffixes/prefixes
  const normalize = (str) => str.toLowerCase()
    .replace(/^(use|get|create|make|build|new)/, '')
    .replace(/(component|util|helper|service|handler|manager)$/, '')
    .replace(/[_-]/g, '');
  
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  
  // Check if one is a substring of the other
  return norm1.includes(norm2) || norm2.includes(norm1);
}

function extractExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];
    
    // Match various export patterns
    const exportPatterns = [
      /export\s+(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s*{\s*([^}]+)\s*}/g,
      /export\s+default\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    ];
    
    exportPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1].includes(',')) {
          // Handle destructured exports
          const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
          exports.push(...names);
        } else {
          exports.push(match[1]);
        }
      }
    });
    
    return exports.filter(name => name && !name.includes(' '));
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}: ${error.message}`);
    return [];
  }
}

function checkForDuplicates() {
  const errors = [];
  
  // Get all TypeScript files
  const files = [
    ...glob.sync('src/**/*.{ts,tsx}', { ignore: ['src/**/*.test.ts', 'src/**/*.spec.ts'] }),
    ...glob.sync('supabase/functions/**/*.ts')
  ];
  
  const fileExports = new Map();
  const allExports = new Map(); // symbol -> [files...]
  
  // Collect all exports
  files.forEach(file => {
    const exports = extractExports(file);
    fileExports.set(file, exports);
    
    exports.forEach(exp => {
      if (!allExports.has(exp)) {
        allExports.set(exp, []);
      }
      allExports.get(exp).push(file);
    });
  });
  
  // Check for identical symbol names across different files
  allExports.forEach((files, symbol) => {
    if (files.length > 1) {
      // Allow symbols in different domains (e.g., types vs implementation)
      const uniqueDomains = new Set(files.map(f => {
        if (f.includes('/types')) return 'types';
        if (f.includes('/components/ui/')) return 'ui';
        if (f.includes('/_shared/')) return 'shared';
        return 'implementation';
      }));
      
      if (uniqueDomains.size === 1 && !symbol.match(/^(Props|Interface|Type|Schema)$/)) {
        errors.push(
          `❌ Duplicate export symbol '${symbol}' found in:\n` +
          files.map(f => `   - ${f}`).join('\n')
        );
      }
    }
  });
  
  // Check for fuzzy name matches against known helpers
  files.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    const exports = fileExports.get(file);
    
    Object.entries(KNOWN_HELPERS).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        // Check filename
        if (fuzzyMatch(fileName, pattern)) {
          const existingFiles = files.filter(f => {
            const existing = path.basename(f, path.extname(f));
            return f !== file && fuzzyMatch(existing, pattern);
          });
          
          if (existingFiles.length > 0) {
            errors.push(
              `❌ Potential duplicate ${category} helper detected:\n` +
              `   New: ${file}\n` +
              `   Existing: ${existingFiles.join(', ')}\n` +
              `   Consider reusing existing ${category} functionality`
            );
          }
        }
        
        // Check exports
        exports.forEach(exp => {
          if (fuzzyMatch(exp, pattern)) {
            files.forEach(otherFile => {
              if (otherFile !== file) {
                const otherExports = fileExports.get(otherFile);
                const matches = otherExports.filter(otherExp => 
                  fuzzyMatch(otherExp, pattern) && otherExp !== exp
                );
                
                if (matches.length > 0) {
                  errors.push(
                    `❌ Potential duplicate ${category} function detected:\n` +
                    `   ${file}: exports '${exp}'\n` +
                    `   ${otherFile}: exports '${matches.join(', ')}'\n` +
                    `   Consider consolidating ${category} functionality`
                  );
                }
              }
            });
          }
        });
      });
    });
  });
  
  return errors;
}

function main() {
  console.log('🔍 Checking for duplicate helpers and components...\n');
  
  const errors = checkForDuplicates();
  
  if (errors.length > 0) {
    console.error('❌ DUPLICATE DETECTION FAILURES:\n');
    errors.forEach(error => console.error(error + '\n'));
    
    console.error('💡 SOLUTIONS:');
    console.error('   - Reuse existing helpers instead of creating new ones');
    console.error('   - Consolidate similar functionality into a single module');
    console.error('   - Use different names if functionality is genuinely different');
    console.error('   - Add _v2 suffix only if absolutely necessary (discouraged)\n');
    
    process.exit(1);
  }
  
  console.log('✅ No duplicate helpers detected. Good job maintaining clean architecture!');
}

if (require.main === module) {
  main();
}

module.exports = { checkForDuplicates, fuzzyMatch, extractExports };