/**
 * Package DALIL Chrome Extension for Release
 * Produces a clean zip archive with manifest.json at the archive root and standard forward-slash paths.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const extDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(extDir, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
const version = manifest.version || '2.1.0';

const releaseDir = path.join(repoRoot, 'release');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const zipFileName = `dalil-extension-v${version}.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

// Files and directories to package
const packageItems = [
  'manifest.json',
  'background',
  'content',
  'core',
  'dashboard',
  'popup',
  'icons',
  'lib',
  'assets',
  'licenses',
  'index.html',
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md'
];

// Verify all items exist
for (const item of packageItems) {
  const itemPath = path.join(extDir, item);
  if (!fs.existsSync(itemPath)) {
    throw new Error(`Required package item not found: ${item}`);
  }
}

// Temporary staging directory
const tempStageDir = path.join(repoRoot, '.tmp', `dalil-release-stage-v${version}`);
if (fs.existsSync(tempStageDir)) {
  fs.rmSync(tempStageDir, { recursive: true, force: true });
}
fs.mkdirSync(tempStageDir, { recursive: true });

console.log(`[1/4] Staging extension v${version} files...`);
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const item of packageItems) {
  const src = path.join(extDir, item);
  const dest = path.join(tempStageDir, item);
  copyRecursive(src, dest);
}

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

console.log(`[2/4] Compressing to ${zipFilePath} with standard forward-slash entries...`);
const makeZipPy = path.join(__dirname, 'make_zip.py');
execSync(`python "${makeZipPy}" "${tempStageDir}" "${zipFilePath}"`, { stdio: 'inherit' });

// Also copy to repo root for quick drag-and-drop into GitHub release
const rootZipPath = path.join(repoRoot, zipFileName);
fs.copyFileSync(zipFilePath, rootZipPath);

console.log(`[3/4] Cleaning up staging directory...`);
fs.rmSync(tempStageDir, { recursive: true, force: true });

const stats = fs.statSync(zipFilePath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`[4/4] Successfully generated release package:`);
console.log(`      -> ${zipFilePath} (${sizeMB} MB)`);
console.log(`      -> ${rootZipPath} (${sizeMB} MB)`);
