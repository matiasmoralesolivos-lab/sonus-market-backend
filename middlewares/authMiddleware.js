
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  try {
    // Obtener token desde el encabezado Authorization
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        mensaje: 'Token de autenticación no proporcionado',
      });
    }

    // Separar Bearer del token
    const token = authorization.split(' ')[1];

    if (!token || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        mensaje: 'Formato de token inválido',
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar información del usuario en la petición
    req.usuario = decoded;

    // Continuar con la siguiente función
    next();

  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token inválido o expirado',
    });
  }
};

module.exports = { verificarToken };
