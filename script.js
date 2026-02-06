// URL de tu Web App (Google Apps Script)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz1nofMJ95SIA9TLS1937DTfR5b0MJCZmx0KEwEIOl11povNbyDtuwbPTT35bYOY9_cjg/exec';
const ALLOWED_ORIGIN = 'https://encuestasonlineweb.github.io';

const form = document.getElementById('encuestaForm');
const statusEl = document.getElementById('status');
const rutInput = document.getElementById('rut');

// --- Utilidades de RUT ---
function cleanRut(rut) { return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase(); }

function formatRut(rut) {
  rut = cleanRut(rut);
  if (rut.length <= 1) return rut;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let out = '';
  for (let i = cuerpo.length - 1, count = 0; i >= 0; i--, count++) {
    if (count === 3) { out = '.' + out; count = 0; }
    out = cuerpo[i] + out;
  }
  return `${out}-${dv}`;
}

function isValidRut(rut) {
  rut = cleanRut(rut);
  if (rut.length < 2) return false;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  let suma = 0, multi = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multi;
    multi = multi === 7 ? 2 : multi + 1;
  }
  const esperado = 11 - (suma % 11);
  const dvEsperado = esperado === 11 ? '0' : esperado === 10 ? 'K' : String(esperado);
  return dv === dvEsperado;
}

// --- Utilidad para obtener valor de Radio Buttons ---
function getRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

// --- LÓGICA DE VISIBILIDAD (ACTUALIZADA) ---
function updateVisibility() {
  // 1. Lógica de Canal (P2 -> P3)
  const canal = getRadioValue('canal');
  const bloqueAmabilidad = document.getElementById('sub_p3_amabilidad');
  const bloqueAsesoria = document.getElementById('sub_p3_asesoria');
  const bloqueWeb = document.getElementById('sub_p3_web');
  const bloqueStock = document.getElementById('sub_p3_stock');

  if (canal === 'web') {
    // CASO WEB: Ocultar todo lo humano Y el stock. Mostrar solo Web.
    if(bloqueAmabilidad) bloqueAmabilidad.classList.add('hidden');
    if(bloqueAsesoria) bloqueAsesoria.classList.add('hidden');
    if(bloqueStock) bloqueStock.classList.add('hidden'); // Ocultamos Stock también
    if(bloqueWeb) bloqueWeb.classList.remove('hidden');
  } else if (canal === 'telefono' || canal === 'terreno') {
    // CASO HUMANO: Mostrar humano y stock. Ocultar web.
    if(bloqueAmabilidad) bloqueAmabilidad.classList.remove('hidden');
    if(bloqueAsesoria) bloqueAsesoria.classList.remove('hidden');
    if(bloqueStock) bloqueStock.classList.remove('hidden'); // Mostramos Stock
    if(bloqueWeb) bloqueWeb.classList.add('hidden');
  }
  // Si no hay selección, mantenemos el estado default del HTML

  // 2. Lógica de Precios (P4 -> P5)
  const p4_1 = parseInt(getRadioValue('p4_1')) || 0;
  const p4_2 = parseInt(getRadioValue('p4_2')) || 0;
  
  // Es detractor si alguna nota de precio es 1 o 2
  const esDetractorPrecio = (p4_1 > 0 && p4_1 <= 2) || (p4_2 > 0 && p4_2 <= 2);
  const bloqueMotivo = document.getElementById('bloque_motivo_precio');

  if (bloqueMotivo) {
    if (esDetractorPrecio) {
      bloqueMotivo.classList.remove('hidden');
    } else {
      bloqueMotivo.classList.add('hidden');
    }
  }

  // 3. Lógica de "Otro" Motivo (P5 -> Input texto)
  const motivo = getRadioValue('motivo_precio');
  const inputOtro = document.getElementById('motivo_precio_otro');
  
  if (inputOtro) {
    if (motivo === 'Otro') {
      inputOtro.classList.remove('hidden');
      inputOtro.required = true;
    } else {
      inputOtro.classList.add('hidden');
      inputOtro.required = false;
      inputOtro.value = ''; 
    }
  }
}

// --- Inicialización de Eventos ---

// 1. Formato RUT en vivo
if (rutInput) {
  rutInput.addEventListener('input', (e) => {
    e.target.value = formatRut(e.target.value);
    e.target.classList.remove('is-invalid');
  });
}

// 2. Escuchar cambios en Radio Buttons para actualizar visibilidad
const inputsConLogica = document.querySelectorAll('input[type=radio]');
inputsConLogica.forEach(input => {
  input.addEventListener('change', updateVisibility);
});

// 3. Envío del Formulario
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validación RUT
    const rutVal = rutInput.value;
    if (!isValidRut(rutVal)) {
      statusEl.textContent = 'RUT inválido. Verifique el dígito verificador.';
      statusEl.style.color = '#cc1f1a';
      rutInput.classList.add('is-invalid');
      return;
    }

    // Validación visual de campos requeridos (NPS)
    const nps = getRadioValue('nps');
    if (!nps) {
      statusEl.textContent = 'Por favor, responda la pregunta 1 (NPS).';
      statusEl.style.color = '#cc1f1a';
      return;
    }

    statusEl.textContent = 'Enviando respuestas...';
    statusEl.style.color = '#233044';
    const btn = form.querySelector('button');
    btn.disabled = true;

    // Construcción del Payload
    const payload = {
      nps: getRadioValue('nps'),
      nps_razon: document.getElementById('nps_razon').value,
      canal: getRadioValue('canal'),
      
      // P3 Atributos Venta
      p3_amabilidad: getRadioValue('p3_1'),
      p3_asesoria: getRadioValue('p3_2'),
      p3_web: getRadioValue('p3_3'),
      p3_stock: getRadioValue('p3_4'),
      
      // P4 Precios
      p4_precio_meds: getRadioValue('p4_1'),
      p4_precio_belleza: getRadioValue('p4_2'),
      
      // P5 Motivo (Si aplica)
      motivo_precio: getRadioValue('motivo_precio'),
      motivo_precio_otro: document.getElementById('motivo_precio_otro').value,
      
      // P6 Entrega
      p6_tiempo: getRadioValue('p6_1'),
      p6_exactitud: getRadioValue('p6_2'),
      p6_estado: getRadioValue('p6_3'),
      
      // ISN y Datos Cliente
      isn: getRadioValue('isn'),
      rut: cleanRut(rutVal),
      rut_formateado: rutVal,
      origin: ALLOWED_ORIGIN,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      statusEl.textContent = '¡Gracias! Tus respuestas fueron registradas correctamente.';
      statusEl.style.color = '#0b6e4f';
      form.reset();
      
      // Restaurar visibilidad inicial
      updateVisibility(); 
      rutInput.classList.remove('is-invalid');
      
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error de conexión. Intente nuevamente.';
      statusEl.style.color = '#cc1f1a';
    } finally {
      btn.disabled = false;
    }
  });
}

// Ejecutar al inicio para asegurar estado visual correcto
updateVisibility();





