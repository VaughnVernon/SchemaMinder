#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function generateHTMLReport() {
  const reportPath = path.join(process.cwd(), 'complexity-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('❌ No complexity report found. Run "npm run complexity" first.');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeScript Complexity Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .summary-card .value { font-size: 28px; font-weight: bold; color: #007bff; }
        .files-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .files-table th, .files-table td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
        .files-table th { background: #f8f9fa; font-weight: 600; }
        .files-table tr:hover { background: #f8f9fa; }
        .complexity-high { color: #dc3545; font-weight: bold; }
        .complexity-medium { color: #ffc107; font-weight: bold; }
        .complexity-low { color: #28a745; }
        .maintainability-low { background: #ffebee; }
        .maintainability-medium { background: #fff3e0; }
        .maintainability-high { background: #e8f5e8; }
        .progress-bar { width: 100px; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .timestamp { color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 TypeScript Complexity Report</h1>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Files Analyzed</h3>
                <div class="value">${report.summary.totalFiles}</div>
            </div>
            <div class="summary-card">
                <h3>Avg Complexity</h3>
                <div class="value">${report.summary.avgComplexity}</div>
            </div>
            <div class="summary-card">
                <h3>Max Complexity</h3>
                <div class="value">${report.summary.maxComplexity}</div>
            </div>
            <div class="summary-card">
                <h3>High Complexity Files</h3>
                <div class="value">${report.summary.highComplexityFiles}</div>
            </div>
        </div>
        
        <h2>📊 File Details</h2>
        <table class="files-table">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Complexity</th>
                    <th>Functions</th>
                    <th>Max Function Length</th>
                    <th>Maintainability Index</th>
                    <th>Maintainability</th>
                </tr>
            </thead>
            <tbody>
                ${report.files.map(file => {
                  const complexityClass = file.cyclomaticComplexity > 20 ? 'complexity-high' : 
                                        file.cyclomaticComplexity > 10 ? 'complexity-medium' : 'complexity-low';
                  const maintainabilityClass = file.maintainabilityIndex < 50 ? 'maintainability-low' : 
                                             file.maintainabilityIndex < 70 ? 'maintainability-medium' : 'maintainability-high';
                  const maintainabilityPercent = Math.max(0, Math.min(100, file.maintainabilityIndex));
                  const maintainabilityColor = maintainabilityPercent > 70 ? '#28a745' : maintainabilityPercent > 50 ? '#ffc107' : '#dc3545';
                  
                  return `
                    <tr class="${maintainabilityClass}">
                        <td title="${file.file}">${file.file.length > 50 ? '...' + file.file.slice(-47) : file.file}</td>
                        <td class="${complexityClass}">${file.cyclomaticComplexity}</td>
                        <td>${file.functionCount}</td>
                        <td>${file.maxFunctionLength}</td>
                        <td>${file.maintainabilityIndex.toFixed(1)}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${maintainabilityPercent}%; background: ${maintainabilityColor};"></div>
                            </div>
                        </td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="timestamp">
            Report generated: ${new Date(report.summary.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>
  `;
  
  const outputPath = path.join(process.cwd(), 'complexity-report.html');
  fs.writeFileSync(outputPath, html);
  console.log('📊 HTML report saved to complexity-report.html');
}

if (require.main === module) {
  generateHTMLReport();
}