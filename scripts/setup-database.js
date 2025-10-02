const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando base de datos...\n');

// Verificar si existe el archivo .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creando archivo .env desde .env.example...');
  const envExample = fs.readFileSync(path.join(__dirname, '..', 'env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ Archivo .env creado');
  console.log('⚠️  Por favor, configura la variable DATABASE_URL en el archivo .env');
}

// Generar cliente de Prisma
console.log('\n🔧 Generando cliente de Prisma...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente de Prisma generado');
} catch (error) {
  console.error('❌ Error generando cliente de Prisma:', error.message);
  process.exit(1);
}

// Aplicar migraciones
console.log('\n📦 Aplicando migraciones...');
try {
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Migraciones aplicadas');
} catch (error) {
  console.error('❌ Error aplicando migraciones:', error.message);
  process.exit(1);
}

// Ejecutar seed
console.log('\n🌱 Ejecutando seed...');
try {
  execSync('npm run db:seed', { stdio: 'inherit' });
  console.log('✅ Seed ejecutado');
} catch (error) {
  console.error('❌ Error ejecutando seed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Base de datos configurada exitosamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Configura la variable DATABASE_URL en .env');
console.log('2. Ejecuta: npm run start:dev');
console.log('3. Visita: http://localhost:3000/api/docs');
