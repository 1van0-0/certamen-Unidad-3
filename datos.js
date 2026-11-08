// datos.js - Pieza entregada (No se modifica)
// Gestiona la conexión con la fuente de datos abiertos.

let datos = null;
let ultimaActualizacion = 0;

function cargarDatos(direccion, minutos) {
  // Pedir de inmediato la primera vez
  pedirJSON(direccion);
  
  // Si minutos es mayor a 0, programar las siguientes peticiones
  if (minutos > 0) {
    setInterval(() => {
      pedirJSON(direccion);
    }, minutos * 60 * 1000);
  }
}

function pedirJSON(direccion) {
  // loadJSON es una función nativa de p5.js
  loadJSON(direccion, function(respuesta) {
    datos = respuesta;
    ultimaActualizacion = millis();
    console.log("Datos recibidos correctamente.");
  }, function(error) {
    console.error("Error al cargar los datos:", error);
  });
}

function segundosSinDatos() {
  if (datos === null) return 0;
  return (millis() - ultimaActualizacion) / 1000;
}