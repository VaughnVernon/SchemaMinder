#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple complexity analysis script using basic heuristics
 * Analyzes TypeScript/TSX files for complexity metrics
 */

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Basic complexity heuristics
  let cyclomaticComplexity = 1; // Base complexity
  let functionCount = 0;
  let maxFunctionLength = 0;
  let currentFunctionLength = 0;
  let totalLines = lines.length;
  let codeLines = 0;
  
  let inFunction = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    
    codeLines++;
    
    // Count complexity-adding constructs
    if (line.includes('if (') || line.includes('} else') || line.includes('else if')) {
      cyclomaticComplexity++;
    }
    if (line.includes('for (') || line.includes('while (') || line.includes('do {')) {
      cyclomaticComplexity++;
    }
    if (line.includes('case ') && line.includes(':')) {
      cyclomaticComplexity++;
    }
    if (line.includes('catch (') || line.includes('} catch')) {
      cyclomaticComplexity++;
    }
    if (line.includes('&&') || line.includes('||')) {
      cyclomaticComplexity += (line.match(/&&|\|\|/g) || []).length;
    }
    if (line.includes('?') && line.includes(':') && !line.includes('//')) {
      cyclomaticComplexity++; // Ternary operators
    }
    
    // Track function boundaries
    if (line.match(/(function|=>|\w+\s*\(.*\)\s*\{|const \w+ = \()/)) {
      functionCount++;
      inFunction = true;
      currentFunctionLength = 0;
    }
    
    if (inFunction) {
      currentFunctionLength++;
    }
    
    // Track braces to detect function end
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    
    if (inFunction && braceDepth === 0 && line.includes('}')) {
      maxFunctionLength = Math.max(maxFunctionLength, currentFunctionLength);
      inFunction = false;
    }
  }
  
  return {
    file: path.relative(process.cwd(), filePath),
    totalLines,
    codeLines,
    cyclomaticComplexity,
    functionCount,
    maxFunctionLength,
    maintainabilityIndex: Math.max(0, Math.min(100, 171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(codeLines || 1)))
  };
}

function findTSFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip test, generated, and config directories
      if (!entry.name.match(/(test|spec|generated|node_modules|dist|coverage)/)) {
        findTSFiles(fullPath, files);
      }
    } else if (entry.name.match(/\.(ts|tsx)$/) && !entry.name.match(/(test|spec|config|main\.tsx)/)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function generateReport() {
  const srcDir = path.join(process.cwd(), 'src');
  const files = findTSFiles(srcDir);
  
  console.log('🔍 TypeScript Complexity Analysis Report');
  console.log('==========================================\n');
  
  const results = files.map(analyzeFile).sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity);
  
  // Summary stats
  const totalFiles = results.length;
  const avgComplexity = results.reduce((sum, r) => sum + r.cyclomaticComplexity, 0) / totalFiles;
  const maxComplexity = Math.max(...results.map(r => r.cyclomaticComplexity));
  const highComplexityFiles = results.filter(r => r.cyclomaticComplexity > 20).length;
  const moderateComplexityFiles = results.filter(r => r.cyclomaticComplexity > 10 && r.cyclomaticComplexity <= 20).length;
  
  console.log(`📊 Summary:`);
  console.log(`   Files analyzed: ${totalFiles}`);
  console.log(`   Average complexity: ${avgComplexity.toFixed(1)}`);
  console.log(`   Maximum complexity: ${maxComplexity}`);
  console.log(`   Moderate complexity files (11-20): ${moderateComplexityFiles}`);
  console.log(`   High complexity files (>20): ${highComplexityFiles}`);
  console.log(`   Very high complexity files (>40): ${results.filter(r => r.cyclomaticComplexity > 40).length}\n`);
  
  // Top 10 most complex files
  console.log('📈 Most Complex Files:');
  console.log('File                                     Complexity  Functions  Max Func Lines  Maintainability');
  console.log('------------------------------------------------------------------------------------------------');
  
  results.slice(0, 10).forEach(result => {
    const complexity = result.cyclomaticComplexity.toString().padEnd(10);
    const functions = result.functionCount.toString().padEnd(10);
    const maxFunc = result.maxFunctionLength.toString().padEnd(14);
    const maintainability = result.maintainabilityIndex.toFixed(1).padEnd(13);
    const file = result.file.length > 40 ? '...' + result.file.slice(-37) : result.file.padEnd(40);
    
    console.log(`${file} ${complexity} ${functions} ${maxFunc} ${maintainability}`);
  });
  
  // Files needing attention
  const needsAttention = results.filter(r => r.cyclomaticComplexity > 15 || r.maxFunctionLength > 50 || r.maintainabilityIndex < 60);
  
  if (needsAttention.length > 0) {
    console.log('\n⚠️  Files Needing Attention:');
    needsAttention.forEach(result => {
      const issues = [];
      if (result.cyclomaticComplexity > 40) issues.push(`Very high complexity (${result.cyclomaticComplexity})`);
      else if (result.cyclomaticComplexity > 20) issues.push(`High complexity (${result.cyclomaticComplexity})`);
      else if (result.cyclomaticComplexity > 15) issues.push(`Moderate complexity (${result.cyclomaticComplexity})`);
      if (result.maxFunctionLength > 50) issues.push(`Long function (${result.maxFunctionLength} lines)`);
      if (result.maintainabilityIndex < 60) issues.push(`Low maintainability (${result.maintainabilityIndex.toFixed(1)})`);
      
      console.log(`   ${result.file}: ${issues.join(', ')}`);
    });
  }
  
  // Save JSON report
  const jsonReport = {
    summary: {
      totalFiles,
      avgComplexity: parseFloat(avgComplexity.toFixed(1)),
      maxComplexity,
      highComplexityFiles,
      timestamp: new Date().toISOString()
    },
    files: results
  };
  
  fs.writeFileSync('complexity-report.json', JSON.stringify(jsonReport, null, 2));
  console.log('\n💾 Detailed report saved to complexity-report.json');
}

// Run the analysis
if (require.main === module) {
  generateReport();
}