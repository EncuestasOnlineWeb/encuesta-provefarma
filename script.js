
// URL del endpoint de Google Apps Script (tu backend)
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxCxvF7rypUh1ORaaqesH-UoBYbM8tLf13PQ1L6pgL_e9B0_CThf5RO4qrl6HvbVZ9WRg/exec';

// Referencias del formulario y del texto de estado
const form = document.getElementById('encuestaForm');
const statusEl = document.getElementById('status');

// Evento al enviar el formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Enviando...';

  // Honeypot anti-spam (si está lleno, es bot)
  const hp = form.querySelector('#empresa');
  if (hp && hp.value.trim() !== '') {
    statusEl.textContent = 'Error de validación.';
    return;
  }

  // Recolectamos los datos del formulario
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let json = null;
    try { 
      json = await res.json(); 
    } catch { 
      /* Si no es JSON, ignoramos */ 
    }

    if (res.ok && json && json.ok) {
      statusEl.textContent = '¡Gracias! Tu respuesta fue enviada.';
      form.reset();
    } else {
      statusEl.textContent = 'Hubo un problema al enviar. Intenta nuevamente.';
    }
  } catch (err) {
    statusEl.textContent = 'No se pudo conectar. Intenta más tarde.';
  }
});
