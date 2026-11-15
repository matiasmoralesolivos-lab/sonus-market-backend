
const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');

describe('Pruebas de la API SonusMarket', () => {

  test('GET / debe responder con estado 200', async () => {
    const respuesta = await request(app).get('/');

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.estado).toBe('Servidor funcionando');
  });

  test('POST /api/usuarios debe responder 400 si faltan datos', async () => {
    const respuesta = await request(app)
      .post('/api/usuarios')
      .send({});

    expect(respuesta.statusCode).toBe(400);
  });

  test('POST /api/login debe responder 400 si faltan datos', async () => {
    const respuesta = await request(app)
      .post('/api/login')
      .send({});

    expect(respuesta.statusCode).toBe(400);
  });

  test('GET /api/perfil debe responder 401 si no hay token', async () => {
    const respuesta = await request(app).get('/api/perfil');

    expect(respuesta.statusCode).toBe(401);
  });


test('GET /api/perfil debe rechazar un token inválido', async () => {
  const respuesta = await request(app)
    .get('/api/perfil')
    .set('Authorization', 'Bearer token-falso-123');

  expect(respuesta.statusCode).toBe(401);
});

test('GET /api/perfil debe aceptar un token válido', async () => {
  const token = jwt.sign(
    {
      id: 3,
      nombre: 'Usuario de Prueba',
      email: 'prueba@sonusmarket.cl',
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const respuesta = await request(app)
    .get('/api/perfil')
    .set('Authorization', `Bearer ${token}`);

  expect(respuesta.statusCode).toBe(200);
  expect(respuesta.body.usuario.id).toBe(3);
});

test('POST /api/login debe responder 401 con un usuario inexistente', async () => {
  const respuesta = await request(app)
    .post('/api/login')
    .send({
      email: 'usuario.inexistente@sonusmarket.cl',
      password: 'ClaveIncorrecta123',
    });

  expect(respuesta.statusCode).toBe(401);
  expect(respuesta.body.mensaje).toBe('Credenciales incorrectas');
});

afterAll(async () => {
  await pool.end();
});

test('POST /api/login debe responder 401 con contraseña incorrecta', async () => {
  const respuesta = await request(app)
    .post('/api/login')
    .send({
      email: 'prueba2@sonusmarket.cl',
      password: 'ClaveIncorrecta123',
    });

  expect(respuesta.statusCode).toBe(401);
  expect(respuesta.body.mensaje).toBe('Credenciales incorrectas');
});


test('POST /api/usuarios debe registrar un usuario correctamente', async () => {
  const email = `jest-${crypto.randomUUID()}@sonusmarket.cl`;
  let usuarioId;

  try {
    const respuesta = await request(app)
      .post('/api/usuarios')
      .send({
        nombre: 'Usuario de Prueba Jest',
        email,
        password: 'Sonus123',
      });

    usuarioId = respuesta.body.id;

    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.body).toHaveProperty('id');
    expect(respuesta.body.nombre).toBe('Usuario de Prueba Jest');
    expect(respuesta.body.email).toBe(email);
  } finally {
    if (usuarioId) {
      await pool.query(
        'DELETE FROM usuarios WHERE id = $1',
        [usuarioId]
      );
    }
  }
});

test('POST /api/usuarios debe rechazar un correo duplicado', async () => {
  const email = `duplicado-${crypto.randomUUID()}@sonusmarket.cl`;
  let usuarioId;

  try {
    const primerRegistro = await request(app)
      .post('/api/usuarios')
      .send({
        nombre: 'Usuario de Prueba',
        email,
        password: 'Sonus123',
      });

    usuarioId = primerRegistro.body.id;

    const segundoRegistro = await request(app)
      .post('/api/usuarios')
      .send({
        nombre: 'Otro Usuario',
        email,
        password: 'Sonus456',
      });

    expect(primerRegistro.statusCode).toBe(201);
    expect(segundoRegistro.statusCode).toBe(409);
    expect(segundoRegistro.body.mensaje).toBe(
      'El correo electrónico ya está registrado'
    );
  } finally {
    if (usuarioId) {
      await pool.query(
        'DELETE FROM usuarios WHERE id = $1',
        [usuarioId]
      );
    }
  }
});

});
