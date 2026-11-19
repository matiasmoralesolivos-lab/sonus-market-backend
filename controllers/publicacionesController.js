
const pool = require('../config/db');

// Obtener todas las publicaciones
const obtenerPublicaciones = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM publicaciones
       ORDER BY fecha_creacion DESC`
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener publicaciones:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Obtener una publicación por su ID
const obtenerPublicacion = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'SELECT * FROM publicaciones WHERE id = $1',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Publicación no encontrada',
      });
    }

    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al obtener publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Crear una publicación
const crearPublicacion = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      imagen_url,
    } = req.body;

    if (
      !nombre ||
      !descripcion ||
      precio === undefined ||
      !categoria ||
      stock === undefined
    ) {
      return res.status(400).json({
        mensaje: 'Todos los campos obligatorios deben estar completos',
      });
    }

    if (
      !Number.isFinite(Number(precio)) ||
      Number(precio) <= 0 ||
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 1
    ) {
      return res.status(400).json({
        mensaje: 'El precio o el stock no son válidos',
      });
    }

    const resultado = await pool.query(
      `INSERT INTO publicaciones
       (usuario_id, nombre, descripcion, precio, categoria, stock, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.usuario.id,
        nombre,
        descripcion,
        Number(precio),
        categoria,
        Number(stock),
        imagen_url || null,
      ]
    );

    return res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al crear publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Actualizar una publicación propia
const actualizarPublicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      imagen_url,
    } = req.body;

    if (
      !nombre ||
      !descripcion ||
      precio === undefined ||
      !categoria ||
      stock === undefined
    ) {
      return res.status(400).json({
        mensaje: 'Todos los campos obligatorios deben estar completos',
      });
    }

    if (
      !Number.isFinite(Number(precio)) ||
      Number(precio) <= 0 ||
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 1
    ) {
      return res.status(400).json({
        mensaje: 'El precio o el stock no son válidos',
      });
    }

    const resultado = await pool.query(
      `UPDATE publicaciones
       SET nombre = $1,
           descripcion = $2,
           precio = $3,
           categoria = $4,
           stock = $5,
           imagen_url = $6
       WHERE id = $7 AND usuario_id = $8
       RETURNING *`,
      [
        nombre,
        descripcion,
        Number(precio),
        categoria,
        Number(stock),
        imagen_url || null,
        id,
        req.usuario.id,
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Publicación no encontrada o no tienes permiso para modificarla',
      });
    }

    return res.status(200).json(resultado.rows[0]);

  } catch (error) {
    console.error('Error al actualizar publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = {
  obtenerPublicaciones,
  obtenerPublicacion,
  crearPublicacion,
  actualizarPublicacion,
};
