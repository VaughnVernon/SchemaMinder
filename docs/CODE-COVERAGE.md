# Code Coverage Analysis

This project uses **Vitest** with **V8 coverage provider** for comprehensive code coverage analysis.

## 📊 **Current Coverage Results**

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   87.43 |    89.88 |   82.94 |   87.43 |
```

**Excellent coverage!** All metrics are above 80% threshold.

## 🚀 **How to Run Coverage Analysis**

### **Basic Coverage Report** (Terminal)
```bash
npm run test:coverage
```

### **Interactive Coverage with UI**
```bash
npm run test:coverage:ui
```

### **Watch Mode with Coverage**
```bash
npm run test:coverage:watch
```

### **Open HTML Coverage Report**
```bash
npm run coverage:open
```

## 📁 **Generated Reports**

Coverage reports are generated in the `coverage/` directory:
- **`coverage/index.html`** - Interactive HTML report
- **`coverage/clover.xml`** - Clover XML format (for CI/CD)
- **`coverage/coverage-final.json`** - JSON format
- **Text report** - Displayed in terminal

## 🎯 **Coverage Configuration**

### **Included in Coverage:**
- `src/**/*.ts` - All TypeScript source files
- `src/**/*.tsx` - All React components

### **Excluded from Coverage:**
- `tests/**` - Test files
- `functions/**` - Cloudflare Workers
- `party/**` - PartyKit server code
- `src/parser/generated/**` - Generated parser files
- `scripts/**` - Build scripts
- Configuration files

### **Coverage Thresholds:**
- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

## 📈 **Coverage Analysis Features**

- ✅ **V8 Provider**: Fast, accurate coverage using Chrome's V8 engine
- ✅ **Multiple Formats**: HTML, XML, JSON, and terminal output
- ✅ **Interactive Reports**: Click through files to see uncovered lines
- ✅ **Branch Coverage**: Tracks conditional logic paths
- ✅ **Function Coverage**: Ensures all functions are tested
- ✅ **Threshold Enforcement**: Fails build if coverage drops below thresholds

## 🔍 **Understanding Coverage Reports**

### **Coverage Metrics:**
- **Statements**: Individual code statements executed
- **Branches**: Conditional branches (if/else, switch, ternary) taken
- **Functions**: Functions/methods called during tests
- **Lines**: Source code lines executed

### **HTML Report Features:**
- 🎯 **File Explorer**: Navigate through your codebase
- 📊 **Visual Indicators**: Red/green highlighting for covered/uncovered code
- 📈 **Detailed Metrics**: Per-file and per-function coverage stats
- 🔍 **Line-by-Line**: See exactly which lines are covered

## 🛠️ **Integration with CI/CD**

The coverage reports can be integrated with CI/CD pipelines:
- Use `clover.xml` for Jenkins, GitHub Actions
- Use `coverage-final.json` for custom integrations
- Coverage thresholds will fail the build if not met