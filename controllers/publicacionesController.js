
const pool = require('../config/db');

// Obtener catálogo de etiquetas
const obtenerEtiquetas = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, categoria
       FROM etiquetas
       ORDER BY categoria, nombre`
    );

    return res.status(200).json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener etiquetas:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Validar y normalizar los IDs de las etiquetas
const validarEtiquetas = (etiquetas) => {
  if (!Array.isArray(etiquetas)) {
    return null;
  }

  const ids = etiquetas.map(Number);

  if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
    return null;
  }

  return [...new Set(ids)];
};

// Obtener todas las publicaciones
const obtenerPublicaciones = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         p.*,
         u.nombre AS vendedor_nombre,
         u.email AS vendedor_email,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', e.id,
                 'nombre', e.nombre
               )
               ORDER BY e.nombre
             )
             FROM publicacion_etiquetas pe
             JOIN etiquetas e ON pe.etiqueta_id = e.id
             WHERE pe.publicacion_id = p.id
           ),
           '[]'::json
         ) AS etiquetas
       FROM publicaciones p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       ORDER BY p.fecha_creacion DESC`
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
      `SELECT
         p.*,
         u.nombre AS vendedor_nombre,
         u.email AS vendedor_email,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', e.id,
                 'nombre', e.nombre
               )
               ORDER BY e.nombre
             )
             FROM publicacion_etiquetas pe
             JOIN etiquetas e ON pe.etiqueta_id = e.id
             WHERE pe.publicacion_id = p.id
           ),
           '[]'::json
         ) AS etiquetas
       FROM publicaciones p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = $1`,
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
  const client = await pool.connect();

  try {
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      imagen_url,
      etiquetas = [],
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

    const idsEtiquetas = validarEtiquetas(etiquetas);

    if (idsEtiquetas === null) {
      return res.status(400).json({
        mensaje: 'Las etiquetas seleccionadas no son válidas',
      });
    }

    await client.query('BEGIN');

    // Comprobar que las etiquetas pertenecen a la categoría
    if (idsEtiquetas.length > 0) {
      const etiquetasValidas = await client.query(
        `SELECT id
         FROM etiquetas
         WHERE id = ANY($1::int[])
           AND categoria = $2`,
        [idsEtiquetas, categoria]
      );

      if (etiquetasValidas.rows.length !== idsEtiquetas.length) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          mensaje: 'Una o más etiquetas no corresponden a la categoría seleccionada',
        });
      }
    }

    // Insertar publicación
    const resultado = await client.query(
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

    const publicacion = resultado.rows[0];

    // Relacionar publicación con sus etiquetas
    if (idsEtiquetas.length > 0) {
      await client.query(
        `INSERT INTO publicacion_etiquetas
         (publicacion_id, etiqueta_id)
         SELECT $1, unnest($2::int[])`,
        [publicacion.id, idsEtiquetas]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...publicacion,
      etiquetas: idsEtiquetas,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al crear publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  } finally {
    client.release();
  }
};

// Actualizar una publicación propia
const actualizarPublicacion = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      imagen_url,
      etiquetas = [],
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

    const idsEtiquetas = validarEtiquetas(etiquetas);

    if (idsEtiquetas === null) {
      return res.status(400).json({
        mensaje: 'Las etiquetas seleccionadas no son válidas',
      });
    }

    await client.query('BEGIN');

    // Comprobar que las etiquetas pertenecen a la categoría
    if (idsEtiquetas.length > 0) {
      const etiquetasValidas = await client.query(
        `SELECT id
         FROM etiquetas
         WHERE id = ANY($1::int[])
           AND categoria = $2`,
        [idsEtiquetas, categoria]
      );

      if (etiquetasValidas.rows.length !== idsEtiquetas.length) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          mensaje: 'Una o más etiquetas no corresponden a la categoría seleccionada',
        });
      }
    }

    // Actualizar únicamente una publicación propia
    const resultado = await client.query(
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
      await client.query('ROLLBACK');

      return res.status(404).json({
        mensaje: 'Publicación no encontrada o no tienes permiso para modificarla',
      });
    }

    // Eliminar las relaciones anteriores
    await client.query(
      `DELETE FROM publicacion_etiquetas
       WHERE publicacion_id = $1`,
      [id]
    );

    // Guardar las nuevas etiquetas
    if (idsEtiquetas.length > 0) {
      await client.query(
        `INSERT INTO publicacion_etiquetas
         (publicacion_id, etiqueta_id)
         SELECT $1, unnest($2::int[])`,
        [id, idsEtiquetas]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      ...resultado.rows[0],
      etiquetas: idsEtiquetas,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al actualizar publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  } finally {
    client.release();
  }
};

// Eliminar una publicación propia

const eliminarPublicacion = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Verificar que la publicación pertenece al usuario
    const resultado = await client.query(
      `SELECT id
       FROM publicaciones
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [id, req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        mensaje: 'Publicación no encontrada o no tienes permiso para eliminarla',
      });
    }

    // Eliminar relaciones con las etiquetas
    await client.query(
      `DELETE FROM publicacion_etiquetas
       WHERE publicacion_id = $1`,
      [id]
    );

    // Eliminar la publicación
    await client.query(
      `DELETE FROM publicaciones
       WHERE id = $1 AND usuario_id = $2`,
      [id, req.usuario.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      mensaje: 'Publicación eliminada correctamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al eliminar publicación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerPublicaciones,
  obtenerPublicacion,
  obtenerEtiquetas,
  crearPublicacion,
  actualizarPublicacion,
  eliminarPublicacion,
};
