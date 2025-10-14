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

async function setupDatabase() {
  try {
    console.log('🚀 Configurando base de datos...');
    
    // Verificar si las tablas ya existen
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Las tablas ya existen, saltando creación de esquema...');
    } else {
      console.log('📋 Creando esquema completo...');
      // Leer y ejecutar el esquema completo de mer.sql
      const merSql = fs.readFileSync(path.join(__dirname, 'mer.sql'), 'utf8');
      await pool.query(merSql);
      console.log('✅ Esquema completo creado exitosamente');
    }
    
    // Leer y ejecutar el script de datos iniciales
    console.log('📊 Insertando datos iniciales...');
    const initSql = fs.readFileSync(path.join(__dirname, 'src/models/init-data.sql'), 'utf8');
    await pool.query(initSql);
    console.log('✅ Datos iniciales insertados exitosamente');
    
    // Verificar que todo esté funcionando
    const result = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`✅ Base de datos configurada. Usuarios en la base: ${result.rows[0].total}`);
    
    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
    console.log('📧 Usuario admin por defecto: admin@bettingsystem.com');
    console.log('🔑 Contraseña: admin123');
    
  } catch (error) {
    console.error('❌ Error configurando la base de datos:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
