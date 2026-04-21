const { db } = require('./db');

async function bootstrap() {
  const dni = '41098519';
  const nombre = 'RONALD CRUZ';
  
  try {
    await db.collection('docentes').doc(dni).set({
      id: dni,
      nombre: nombre,
      password: dni,
      role: 'pip',
      fechaRegistro: new Date()
    });
    console.log(`Usuario Administrador (PIP) ${nombre} con DNI ${dni} registrado con éxito.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    process.exit(1);
  }
}

bootstrap();
