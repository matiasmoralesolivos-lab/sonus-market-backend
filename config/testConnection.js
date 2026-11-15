const pool = require('./db');

const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');

    console.log('Conexión a PostgreSQL exitosa');
    console.log('Fecha del servidor:', result.rows[0].now);
  } catch (error) {
    console.error('Error de conexión:', error.message);
  } finally {
    await pool.end();
  }
};

testConnection();