# Complexity Analysis

This project includes a custom complexity analysis tool to help identify code that may need refactoring.

## Available Commands

### `npm run complexity`
Runs complexity analysis and displays results in the terminal.

### `npm run complexity:json`
Same as above, but emphasizes that results are saved to `complexity-report.json`.

### `npm run complexity:html`
Generates both JSON and HTML reports. The HTML report provides a visual dashboard.

### `npm run complexity:open`
Generates HTML report and opens it in your default browser.

## Metrics Explained

### Cyclomatic Complexity
- **1-10**: Simple, easy to understand
- **11-20**: Moderate complexity, consider refactoring
- **21+**: High complexity, should be refactored

### Maintainability Index
- **70-100**: High maintainability (green)
- **50-69**: Moderate maintainability (yellow)  
- **0-49**: Low maintainability (red)

### Function Length
- **1-50 lines**: Acceptable
- **51+ lines**: Consider breaking into smaller functions

## Current Analysis Results

Based on the latest run:
- **33 files analyzed**
- **Average complexity**: 29.7 (high)
- **Files needing attention**: 20 (60%)

### Top Files to Refactor:
1. `HierarchyTree.tsx` - Complexity: 155 (Very High)
2. `App.tsx` - Complexity: 119 (Very High) 
3. `SchemaVersionForm.tsx` - Complexity: 98 (Very High)

## Recommendations

1. **Break down large components** into smaller, focused components
2. **Extract utility functions** for complex logic
3. **Reduce nested conditionals** using early returns
4. **Consider using state machines** for complex state logic
5. **Split large files** when they have multiple responsibilities

## Continuous Improvement

Run complexity analysis regularly:
- Before major refactoring efforts
- As part of code review process
- When adding significant new features

The goal is to gradually reduce complexity over time while maintaining functionality.