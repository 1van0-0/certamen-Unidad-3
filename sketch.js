// VARIABLES GENERALES DE LA PAUTA
let fuente = "real"; // Cambiar a "simulada" para sacar las fotos del informe
let mic;
let senal = 0; // Señal suavizada que siempre irá de 0 a 1
let permisoAudio = false;

// VARIABLES DE CALIBRACIÓN (Modifícalas midiendo tu sala)
let minRuido = 0.047; // El silencio absoluto medido
let maxRuido = 0.200; // Un aplauso o un grito

// DATOS EXTERNOS (USGS Sismos)
let urlSismos = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";
let enjambre = [];
let versionDatos = 0; // momento de los datos con que se construyó el enjambre

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Cargar los datos externos (datos.js está cargado en el HTML)
  // El micrófono se enciende recién al hacer clic (ver mousePressed)
  cargarDatos(urlSismos, 15); 
}

// El navegador exige interacción para habilitar el sonido
function mousePressed() {
  if (mic) {
    return; // micrófono único
  }
  userStartAudio();
  mic = new p5.AudioIn();
  // permiso real
  mic.start(
    function() { permisoAudio = true; }, // éxito
    function() { console.error("Micrófono denegado o no disponible"); } // error
  );
}

// Si la ventana cambia de tamaño, se recalculan las posiciones
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  versionDatos = 0; // obliga a reconstruir el enjambre
}

// LA ÚNICA FUNCIÓN QUE SABE DE DÓNDE VIENE EL DATO (Regla de oro de la Unidad 3)
function leerSenal() {
  if (fuente === "simulada") {
    return noise(frameCount * 0.01); 
  }
  
  if (fuente === "real" && permisoAudio) {
    let lectura = mic.getLevel();
    // Calibración estricta con constrain()
    let s = map(lectura, minRuido, maxRuido, 0, 1);
    return constrain(s, 0, 1); 
  }
  
  return 0; // Si no hay permiso o falla, la señal cae a 0
}

// CREACIÓN DE LOS AGENTES EN BASE A DATOS ABIERTOS
function crearDesdeDatos() {
  for (let f of datos.features) {
    // Extraemos los datos del JSON
    let lon = f.geometry.coordinates[0];
    let lat = f.geometry.coordinates[1];
    let mag = f.properties.mag;
    
    // Agregamos un nodo al enjambre mapeando longitud y latitud a la pantalla
    enjambre.push({
      xBase: map(lon, -180, 180, 50, width - 50),
      yBase: map(lat, 90, -90, 50, height - 50),
      x: 0,
      y: 0,
      magnitud: mag
    });
  }
}

function draw() {
  background(15, 20, 30);
  
  // PLAN DE FALLAS 1: Si los datos externos aún no llegan (datos es null)
  if (datos === null) {
    fill(255, 100);
    textAlign(CENTER, CENTER);
    text("CONECTANDO CON SERVICIO GEOLÓGICO...", width/2, height/2);
    return; // Detiene el dibujo aquí
  }
  
  // PLAN DE FALLAS 2: Si llegaron los datos, pero no se ha dado permiso al micrófono
  if (!permisoAudio && fuente === "real") {
    fill(255, 100);
    textAlign(CENTER, CENTER);
    text("HAZ CLIC EN LA PANTALLA PARA ACTIVAR EL SENSOR ACÚSTICO", width/2, height/2);
    return; // Detiene el dibujo aquí
  }
  
  // Si llegaron datos nuevos (o cambió la ventana), se reconstruye el enjambre
  if (versionDatos !== ultimaActualizacion) {
    enjambre = [];
    crearDesdeDatos();
    versionDatos = ultimaActualizacion;
  }
  
  // LECTURA Y SUAVIZADO DE LA SEÑAL ACÚSTICA
  senal = lerp(senal, leerSenal(), 0.1); 
  
  // VARIABLES VISUALES CONTROLADAS POR LA SEÑAL (Ruido)
  // 1. Color: De cyan (tranquilidad) a rojo (pánico)
  let colorNodo = lerpColor(color(0, 200, 255), color(255, 50, 50), senal);
  // 2. Fuerza de vibración (Caos)
  let vibracion = map(senal, 0, 1, 0, 50); 
  // 3. Radio de conexión de la malla
  let radioConexion = map(senal, 0, 1, 150, 20); 

  // DIBUJAR LA MALLA
  // posiciones primero
  for (let a of enjambre) {
    a.x = a.xBase + random(-vibracion, vibracion);
    a.y = a.yBase + random(-vibracion, vibracion);
  }

  // dibujo después
  strokeWeight(1);
  for (let i = 0; i < enjambre.length; i++) {
    let a = enjambre[i];

    // Conectar con otros nodos cercanos
    for (let j = i + 1; j < enjambre.length; j++) {
      let b = enjambre[j];
      let distancia = dist(a.x, a.y, b.x, b.y);
      
      // Si están dentro del radio de percepción, dibujar línea
      if (distancia < radioConexion) {
        stroke(colorNodo.levels[0], colorNodo.levels[1], colorNodo.levels[2], 100);
        line(a.x, a.y, b.x, b.y);
      }
    }
    
    // Dibujar el nodo (sismo) - su tamaño base depende de la magnitud real
    noStroke();
    fill(colorNodo);
    let diametroBase = map(a.magnitud, 4.5, 8, 5, 25);
    diametroBase = constrain(diametroBase, 5, 25);
    circle(a.x, a.y, diametroBase + vibracion/2);
  }
  
  // UI de Debug (Opcional, para que veas el número en vivo)
  noStroke(); // texto sin contorno
  fill(255);
  textAlign(LEFT, TOP);
  text("Señal calibrada: " + nf(senal, 1, 3), 10, 10);
  
  // PLAN DE FALLAS 3: los datos tienen más de 20 minutos (falló la recarga)
  if (segundosSinDatos() > 20 * 60) {
    fill(255, 200, 0);
    text("DATOS DESACTUALIZADOS: " + round(segundosSinDatos() / 60) + " min", 10, 30);
  }
}
