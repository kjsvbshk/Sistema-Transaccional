const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generando claves JWT RSA...');

// Generar par de claves RSA
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Crear directorio keys si no existe
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Guardar claves
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('✅ Claves generadas exitosamente:');
console.log(`  📁 Directorio: ${keysDir}`);
console.log(`  🔑 Clave privada: ${privateKeyPath}`);
console.log(`  🔑 Clave pública: ${publicKeyPath}`);

// Mostrar las claves generadas
console.log('\n📋 Clave privada:');
console.log(privateKey);

console.log('\n📋 Clave pública:');
console.log(publicKey);

console.log('\n🎉 ¡Claves JWT generadas correctamente!');