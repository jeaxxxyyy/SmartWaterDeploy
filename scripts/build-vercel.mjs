import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const build = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: root,
    stdio: 'inherit',
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish assets separately so PHP source and local storage never become static downloads.
await cp(path.join(root, 'public'), output, {
    recursive: true,
    filter: async (source) => {
        const relative = path.relative(path.join(root, 'public'), source);
        if (!relative) return true;
        if (relative.split(path.sep).some((part) => part.startsWith('.') || part === 'storage')) return false;
        if (/\.(?:php\d*|phtml|phar)$/i.test(source)) return false;
        return !(await lstat(source)).isSymbolicLink();
    },
});

const assets = await readdir(output);
console.log(`Vercel static assets prepared: ${assets.join(', ')}`);
