const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Crear directorio keys si no existe
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generar par de claves RSA
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Escribir claves a archivos
fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

console.log('✅ Claves JWT generadas exitosamente:');
console.log('   - keys/private.pem');
console.log('   - keys/public.pem');
console.log('\n🔐 Estas claves se usan para firmar y verificar tokens JWT');
console.log('⚠️  IMPORTANTE: Mantén la clave privada segura y no la compartas');
