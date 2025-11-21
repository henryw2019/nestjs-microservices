const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && file.endsWith('.ts')) {
            callback(filepath);
        }
    });
}

const generatedDir = path.join(__dirname, '../src/generated');

if (fs.existsSync(generatedDir)) {
    walk(generatedDir, (filepath) => {
        let content = fs.readFileSync(filepath, 'utf8');
        // Replace .ts extension in imports/exports
        // Matches: from "./something.ts"; or from './something.ts';
        const regex = /(from\s+['"]\..+?)(\.ts)(['"])/g;
        
        if (regex.test(content)) {
            console.log(`Fixing imports in ${filepath}`);
            content = content.replace(regex, '$1$3');
            fs.writeFileSync(filepath, content);
        }

        // Remove ESM __dirname polyfill for CJS compatibility
        const polyfillRegex = /globalThis\['__dirname'\]\s*=\s*path\.dirname\(fileURLToPath\(import\.meta\.url\)\)/g;
        if (polyfillRegex.test(content)) {
             console.log(`Removing ESM polyfill in ${filepath}`);
             content = content.replace(polyfillRegex, '// globalThis[\'__dirname\'] = ... (removed for CJS)');
             fs.writeFileSync(filepath, content);
        }
    });
} else {
    console.log('No generated directory found.');
}
