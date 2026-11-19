
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Resend } = require('resend');



// Registrar usuario
const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        mensaje: 'Todos los campos son obligatorios',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email`,
      [nombre, email, passwordHash]
    );

    return res.status(201).json(resultado.rows[0]);

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'El correo electrónico ya está registrado',
      });
    }

    console.error('Error al registrar usuario:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Solicitar recuperación de contraseña
const solicitarRecuperacion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        mensaje: 'Debes ingresar tu correo electrónico',
      });
    }

    const resultado = await pool.query(
      `SELECT id, nombre, email
       FROM usuarios
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (resultado.rows.length === 0) {
      return res.status(200).json({
        mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación',
      });
    }

    const usuario = resultado.rows[0];

    const token = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const fechaExpiracion = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO recuperacion_password
       (usuario_id, token_hash, fecha_expiracion)
       VALUES ($1, $2, $3)`,
      [usuario.id, tokenHash, fechaExpiracion]
    );

    const frontendURL =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const enlace = `${frontendURL}/recuperar-password?token=${token}`;

   if (!process.env.RESEND_API_KEY) {
  await pool.query(
    'DELETE FROM recuperacion_password WHERE token_hash = $1',
    [tokenHash]
  );

  return res.status(500).json({
    mensaje: 'El servicio de correo no está configurado',
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);

const { error } = await resend.emails.send({
      from: 'SonusMarket <onboarding@resend.dev>',
      to: [usuario.email],
      subject: 'Recuperación de contraseña - SonusMarket',
      html: `
        <h2>Hola ${usuario.nombre}</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${enlace}">Restablecer mi contraseña</a></p>
        <p>Este enlace vence en 15 minutos.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      `,
    });

    if (error) {
      await pool.query(
        'DELETE FROM recuperacion_password WHERE token_hash = $1',
        [tokenHash]
      );

      console.error('Error al enviar correo:', error);

      return res.status(500).json({
        mensaje: 'No fue posible enviar el correo de recuperación',
      });
    }

    return res.status(200).json({
      mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación',
    });

  } catch (error) {
    console.error('Error en recuperación:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};


// Restablecer contraseña
const restablecerPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({
        mensaje: 'El token y la nueva contraseña son obligatorios',
      });
    }

    if (nuevaPassword.length < 8) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    // Calcular hash del token recibido
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    await client.query('BEGIN');

    // Buscar token válido y bloquearlo durante la operación
    const resultado = await client.query(
      `SELECT id, usuario_id
       FROM recuperacion_password
       WHERE token_hash = $1
         AND usado = FALSE
         AND fecha_expiracion > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        mensaje: 'El enlace es inválido o ha vencido',
      });
    }

    const recuperacion = resultado.rows[0];

    // Cifrar nueva contraseña
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    // Actualizar contraseña del usuario
    await client.query(
      `UPDATE usuarios
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, recuperacion.usuario_id]
    );

    // Marcar token como utilizado
    await client.query(
      `UPDATE recuperacion_password
       SET usado = TRUE
       WHERE id = $1`,
      [recuperacion.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      mensaje: 'Contraseña actualizada correctamente',
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al restablecer contraseña:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });

  } finally {
    client.release();
  }
};


module.exports = {
  registrarUsuario,
  solicitarRecuperacion,
  restablecerPassword,
};
