const fs = require('fs');
const path = require('path');

// Obtener el tipo de actualización: 'major', 'minor', o 'patch' (por defecto)
const type = process.argv[2] || 'patch';

const filesToUpdate = [
  path.join(__dirname, '../package.json'),
  path.join(__dirname, '../frontend/package.json'),
  path.join(__dirname, '../backend/package.json')
];

// Leer versión actual del package.json principal
const rootPkgPath = filesToUpdate[0];
if (!fs.existsSync(rootPkgPath)) {
  console.error('No se pudo encontrar el package.json principal.');
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const currentVersion = rootPkg.version || '1.0.0';

let [major, minor, patch] = currentVersion.split('.').map(Number);

if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (type === 'minor') {
  minor += 1;
  patch = 0;
} else if (type === 'patch') {
  patch += 1;
} else {
  console.error(`Tipo de versión desconocido: ${type}. Usa major, minor o patch.`);
  process.exit(1);
}

const newVersion = `${major}.${minor}.${patch}`;
console.log(`\n📦 Subiendo versión de ${currentVersion} a ${newVersion} (${type} update)...\n`);

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    // Leer archivo manteniendo el formato
    const content = fs.readFileSync(file, 'utf8');
    // Usar regex para reemplazar solo la línea de la versión y mantener el formato exacto del resto del JSON
    const updatedContent = content.replace(
      /"version"\s*:\s*"[^"]+"/,
      `"version": "${newVersion}"`
    );
    
    fs.writeFileSync(file, updatedContent, 'utf8');
    console.log(`✅ Actualizado: ${path.relative(path.join(__dirname, '..'), file)}`);
  } else {
    console.warn(`⚠️ Archivo no encontrado: ${file}`);
  }
});

console.log('\n🚀 Versiones actualizadas correctamente. Iniciando compilación...\n');
