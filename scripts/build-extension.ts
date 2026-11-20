import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { generateExtensionFiles } from '../src/services/extensionExporter';

const outDir = path.resolve(process.cwd(), 'dist/chronotask-extension');
const zipFile = path.resolve(process.cwd(), 'dist/chronotask-extension-v1.3.2.zip');
const iconsDir = path.resolve(process.cwd(), 'public/icons');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'icons'), { recursive: true });

const zip = new JSZip();
const files = generateExtensionFiles();

for (const file of files) {
  const filePath = path.join(outDir, file.path);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, file.content, 'utf8');
  zip.file(file.path, file.content);
}

// Copy icons
const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
const iconsFolder = zip.folder('icons');

for (const icon of icons) {
  const src = path.join(iconsDir, icon);
  if (fs.existsSync(src)) {
    const data = fs.readFileSync(src);
    fs.writeFileSync(path.join(outDir, 'icons', icon), data);
    iconsFolder?.file(icon, data);
  }
}

// Copy privacy.html if exists
const privacySrc = path.resolve(process.cwd(), 'public/privacy.html');
if (fs.existsSync(privacySrc)) {
  const data = fs.readFileSync(privacySrc, 'utf8');
  fs.writeFileSync(path.join(outDir, 'privacy.html'), data, 'utf8');
  zip.file('privacy.html', data);
}

// Write zip
zip.generateAsync({ type: 'nodebuffer' }).then((buf) => {
  fs.writeFileSync(zipFile, buf);
  console.log('✅ Extension built successfully:');
  console.log('   Unpacked folder:', outDir);
  console.log('   ZIP package:    ', zipFile);
});
