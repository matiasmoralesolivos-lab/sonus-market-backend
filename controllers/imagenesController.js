
let imageKitClient;

const obtenerClienteImageKit = async () => {
  if (!imageKitClient) {
    const { default: ImageKit } = await import('@imagekit/nodejs');

    imageKitClient = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    });
  }

  return imageKitClient;
};

const obtenerAutenticacionImagenes = async (req, res) => {
  try {
    if (
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.IMAGEKIT_PUBLIC_KEY
    ) {
      return res.status(500).json({
        mensaje: 'Falta configurar ImageKit en el servidor',
      });
    }

    const cliente = await obtenerClienteImageKit();

    const parametros =
      cliente.helper.getAuthenticationParameters();

    return res.status(200).json({
      ...parametros,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('Error de autenticación ImageKit:', error.message);

    return res.status(500).json({
      mensaje: 'No se pudo generar la autenticación de imágenes',
    });
  }
};

module.exports = {
  obtenerAutenticacionImagenes,
};
