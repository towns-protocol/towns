#!/usr/bin/env node

/**
 * Post-build script to fix ES module imports by adding .js extensions
 * This resolves the ERR_MODULE_NOT_FOUND errors when consuming the SDK as an ES module
 */

const fs = require('fs')
const path = require('path')

function fixImportsInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    let hasChanges = false
    
    const fixed = content
        .replace(/from '\.\/([^']+)'/g, (match, modulePath) => {
            if (modulePath.endsWith('.js')) return match
            hasChanges = true
            return `from './${modulePath}.js'`
        })
        .replace(/export \* from '\.\/([^']+)'/g, (match, modulePath) => {
            if (modulePath.endsWith('.js')) return match
            hasChanges = true
            return `export * from './${modulePath}.js'`
        })
        .replace(/import\('\.\/([^']+)'\)/g, (match, modulePath) => {
            if (modulePath.endsWith('.js')) return match
            hasChanges = true
            return `import('./${modulePath}.js')`
        })
        .replace(/\.js\.js(['"])/g, '.js$1')
    
    if (hasChanges) {
        fs.writeFileSync(filePath, fixed)
        console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`)
        return true
    }
    
    return false
}

function fixAllImports(dir) {
    let totalFixed = 0
    
    function processDirectory(currentDir) {
        const files = fs.readdirSync(currentDir)
        
        for (const file of files) {
            const filePath = path.join(currentDir, file)
            const stat = fs.statSync(filePath)
            
            if (stat.isDirectory()) {
                processDirectory(filePath)
            } else if (file.endsWith('.js')) {
                if (fixImportsInFile(filePath)) {
                    totalFixed++
                }
            }
        }
    }
    
    processDirectory(dir)
    return totalFixed
}

const distDir = path.join(__dirname, '../dist')

if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run `yarn build` first.')
    process.exit(1)
}

console.log('🔧 Fixing ES module imports in compiled output...')
const fixedCount = fixAllImports(distDir)

if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} files with missing .js extensions`)
} else {
    console.log('✅ No files needed fixing (all imports already have .js extensions)')
}

console.log('🎉 ES module import fix completed!') 