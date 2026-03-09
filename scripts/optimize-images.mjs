import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure sharp is available or install it temporarily
async function ensureSharp() {
    try {
        await import('sharp');
        console.log('✅ Sharp ya está instalado.');
    } catch (e) {
        console.log('⏳ Instalando sharp (temporal)...');
        await execPromise('npm i sharp --no-save');
        console.log('✅ Sharp instalado con éxito.');
    }
}

async function optimizeImage(filePath, quality = 60) {
    const sharp = (await import('sharp')).default;
    const tempPath = filePath + '.tmp';

    try {
        const statsBefore = fs.statSync(filePath);
        const sizeBefore = (statsBefore.size / 1024).toFixed(2);

        // Process image
        await sharp(filePath)
            .webp({ quality: quality, effort: 6 }) // effort: 6 is max compression for webp
            .toFile(tempPath);

        const statsAfter = fs.statSync(tempPath);
        const sizeAfter = (statsAfter.size / 1024).toFixed(2);

        // Replace original
        fs.renameSync(tempPath, filePath);

        console.log(`🖼️ [OK] ${path.basename(filePath)} | ${sizeBefore} KB -> ${sizeAfter} KB (-${(((statsBefore.size - statsAfter.size) / statsBefore.size) * 100).toFixed(1)}%)`);
    } catch (error) {
        console.error(`❌ Error en ${filePath}:`, error.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

async function main() {
    console.log('Iniciando Optimización de Imágenes...');
    await ensureSharp();

    const publicDir = path.resolve(__dirname, '../public');

    // Lista de archivos manual extraídos de los errores
    const targets = [
        { file: 'cta.webp', quality: 60 },
        { file: 'team/claudio/claudio.webp', quality: 50 },
        { file: 'team/chad/chad.webp', quality: 50 },
        { file: 'team/genny/geny.webp', quality: 50 },
        // Also include the new hero-bg.webp just in case it's huge
        { file: 'hero-bg.webp', quality: 65 }
    ];

    for (const target of targets) {
        const fullPath = path.join(publicDir, target.file);
        if (fs.existsSync(fullPath)) {
            await optimizeImage(fullPath, target.quality);
        } else {
            console.warn(`⚠️ Omitido: no se encontró ${fullPath}`);
        }
    }

    console.log('🏁 Optimización completada.');
}

main().catch(console.error);
