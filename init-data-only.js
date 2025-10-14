const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initDataOnly() {
  try {
    console.log('🚀 Insertando solo datos iniciales...');
    
    // Verificar que las tablas existan
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Error: Las tablas no existen. Ejecuta primero el esquema completo.');
      console.log('💡 Usa: npm run setup-db (para crear esquema + datos)');
      process.exit(1);
    }
    
    // Leer y ejecutar solo el script de datos iniciales
    const initSql = fs.readFileSync(path.join(__dirname, 'src/models/init-data.sql'), 'utf8');
    await pool.query(initSql);
    console.log('✅ Datos iniciales insertados exitosamente');
    
    // Verificar que todo esté funcionando
    const result = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`✅ Usuarios en la base: ${result.rows[0].total}`);
    
    console.log('\n🎉 ¡Datos iniciales configurados exitosamente!');
    console.log('📧 Usuario admin por defecto: admin@bettingsystem.com');
    console.log('🔑 Contraseña: admin123');
    
  } catch (error) {
    console.error('❌ Error insertando datos iniciales:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDataOnly();
