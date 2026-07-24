// ============================================================
// 1. CONFIGURACIÓN DE SERVICIOS EXTERNOS
// ============================================================

// --- Sheet.best (Google Sheets) ---
const SHEETBEST_URL = 'https://api.sheetbest.com/sheets/e051d1c5-b766-48c0-bace-713b5b13ea2c'; // Tu URL

// --- WhatsApp del organizador ---
const WHATSAPP_NUMBER = '5215634071484'; // Formato: código país + número (sin +, sin espacios)

// ============================================================
// 2. BASE DE DATOS DE INVITADOS (JSON)
// ============================================================

let invitadosDB = {};
let currentGuest = null;
let countdownInterval = null;

// ============================================================
// 3. ELEMENTOS DEL DOM
// ============================================================

const accessScreen = document.getElementById('access-screen');
const mainContent = document.getElementById('main-content');
const accessCodeInput = document.getElementById('accessCode');
const submitBtn = document.getElementById('submitAccess');
const errorDiv = document.getElementById('errorAccess');
const dynamicWelcomeSpan = document.getElementById('dynamicWelcome');
const dynamicPasesSpan = document.getElementById('dynamicPases');
const familiaInput = document.getElementById('familiaName');
const maxPasesInput = document.getElementById('maxPases');
const asistenciaSelect = document.getElementById('asistenciaSelect');
const asistentesNum = document.getElementById('asistentesNum');
const rsvpForm = document.getElementById('rsvpForm');
const rsvpFeedback = document.getElementById('rsvpFeedback');
const scrollToRSVP = document.getElementById('scrollToRSVP');

// ============================================================
// 4. CARGA DE DATOS DE INVITADOS (desde JSON)
// ============================================================

async function loadInvitados() {
  try {
    const response = await fetch('data/invitados.json');
    const data = await response.json();
    invitadosDB = data;
    restoreSession(); // intentar restaurar sesión después de cargar
  } catch (error) {
    console.error('Error cargando invitados.json', error);
    // Fallback
    invitadosDB = {
      "1025": { familia: "Familia González", pases: 4 },
      "2040": { familia: "Andrea Martínez", pases: 2 }
    };
    restoreSession();
  }
}

// ============================================================
// 5. CONTADOR REGRESIVO (3 oct 2026, 14:00 CST = 20:00 UTC)
// ============================================================

function initCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const targetUTC = Date.UTC(2026, 9, 3, 20, 0, 0); // Octubre = mes 9

  function updateNumbers() {
    const nowUTC = new Date().getTime();
    let diff = targetUTC - nowUTC;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / (3600000));
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const dayElem = document.getElementById('days');
    const hourElem = document.getElementById('hours');
    const minElem = document.getElementById('minutes');
    const secElem = document.getElementById('seconds');

    if (dayElem) dayElem.innerText = days.toString().padStart(2, '0');
    if (hourElem) hourElem.innerText = hours.toString().padStart(2, '0');
    if (minElem) minElem.innerText = minutes.toString().padStart(2, '0');
    if (secElem) {
      secElem.innerText = seconds.toString().padStart(2, '0');
      // Animación suave en segundos
      secElem.style.transform = 'scale(1.1)';
      setTimeout(() => { if(secElem) secElem.style.transform = 'scale(1)'; }, 200);
    }
  }

  updateNumbers();
  countdownInterval = setInterval(updateNumbers, 1000);
}

// ============================================================
// 6. ACCESO Y SESIÓN
// ============================================================

function handleAccess() {
  const code = accessCodeInput.value.trim();
  if (invitadosDB[code]) {
    currentGuest = invitadosDB[code];
    sessionStorage.setItem('weddingAccess', JSON.stringify(currentGuest));
    gsap.to(accessScreen, { opacity: 0, duration: 1.2, ease: "power2.inOut", onComplete: () => {
      accessScreen.style.display = 'none';
      mainContent.style.display = 'block';
      gsap.to(mainContent, { opacity: 1, duration: 1.6, ease: "power2.out" });
      updateUIConGuest();
      initScrollAndAnimations();
      initMap();
      initSwiper();
      initCountdown();
      tryAutoMusic();
    }});
  } else {
    errorDiv.style.display = 'block';
    gsap.fromTo(errorDiv, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 });
    setTimeout(() => { errorDiv.style.display = 'none'; }, 2500);
  }
}

function updateUIConGuest() {
  if (currentGuest) {
    dynamicWelcomeSpan.innerText = `Familia ${currentGuest.familia}`;
    dynamicPasesSpan.innerText = `Esta invitación es válida para ${currentGuest.pases} personas`;
    familiaInput.value = currentGuest.familia;
    maxPasesInput.value = currentGuest.pases;
    asistentesNum.max = currentGuest.pases;
  }
}

function restoreSession() {
  const stored = sessionStorage.getItem('weddingAccess');
  if (stored && Object.keys(invitadosDB).length > 0) {
    currentGuest = JSON.parse(stored);
    const found = Object.values(invitadosDB).some(g => g.familia === currentGuest.familia && g.pases === currentGuest.pases);
    if (found) {
      accessScreen.style.display = 'none';
      mainContent.style.display = 'block';
      updateUIConGuest();
      initScrollAndAnimations();
      initMap();
      initSwiper();
      initCountdown();
      gsap.to(mainContent, { opacity: 1, duration: 0.8 });
      tryAutoMusic();
      return;
    }
  }
  accessScreen.style.display = 'flex';
  mainContent.style.display = 'none';
}

// ============================================================
// 7. SCROLL, PARALLAX Y PROGRESS BAR
// ============================================================

let lenis;
function initScrollAndAnimations() {
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ smoothWheel: true, lerp: 0.07, wheelMultiplier: 1 });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('section').forEach(section => {
    gsap.fromTo(section, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 1.2,
      scrollTrigger: { trigger: section, start: "top 85%", toggleActions: "play none none reverse" }
    });
  });
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = scrolled + '%';
  });
}

// ============================================================
// 8. MAPA (Leaflet)
// ============================================================

let mapInitialized = false;
function initMap() {
  if (typeof L !== 'undefined' && document.getElementById('mapContainer') && !mapInitialized) {
    // Cambia estas coordenadas por las de tu ubicación
    const lat = 19.25111;   // Metepec, Estado de México (aproximado)
    const lng = -99.60472;
    const map = L.map('mapContainer').setView([lat, lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup('Loma Linda Jardín Social · Metepec').openPopup();
    mapInitialized = true;
  }
}

// ============================================================
// 9. HERO SWIPER
// ============================================================

let heroSwiper;
function initSwiper() {
  if (document.querySelector('.hero-swiper') && !heroSwiper) {
    heroSwiper = new Swiper('.hero-swiper', {
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 1800,
      allowTouchMove: false
    });
  }
}

// ============================================================
// 10. MÚSICA AMBIENTAL
// ============================================================

const musicBtn = document.getElementById('musicControl');
const bgAudio = document.getElementById('bgMusic');
let musicEnabled = false;

if (musicBtn) {
  musicBtn.addEventListener('click', () => {
    if (musicEnabled) {
      bgAudio.pause();
      musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i> <span>♫ Música</span>';
    } else {
      bgAudio.muted = false;
      bgAudio.play().catch(e => console.log("Autoplay restringido"));
      musicBtn.innerHTML = '<i class="fas fa-music"></i> <span>Tu y Yo</span>';
    }
    musicEnabled = !musicEnabled;
  });
}

function tryAutoMusic() {
  if (bgAudio) {
    bgAudio.muted = true;
    bgAudio.play().catch(()=>{});
  }
}

// ============================================================
// 11. RSVP CON SHEET.BEST + WHATSAPP (TU CÓDIGO MEJORADO)
// ============================================================

rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGuest) return;

  const asistencia = asistenciaSelect.value;
  let asistentes = parseInt(asistentesNum.value) || 0;
  const max = currentGuest.pases;

  // Validaciones
  if (asistencia === 'si' && asistentes > max) {
    rsvpFeedback.innerHTML = '<span style="color:#b56534;">❌ El número de asistentes excede los pases permitidos.</span>';
    return;
  }
  if (asistencia === 'no') asistentes = 0;
  if (asistencia === '') {
    rsvpFeedback.innerHTML = '<span style="color:#b56534;">Por favor indica si asistirás.</span>';
    return;
  }

  const comentarios = document.getElementById('comentarios').value;

  // 1. Preparar datos para Sheet.best
  const data = {
    Familia: currentGuest.familia,
    Pases: currentGuest.pases,
    Asistencia: asistencia === 'si' ? 'Sí' : 'No',
    Asistentes: asistentes,
    Comentarios: comentarios,
    Fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
  };

  try {
    // 2. Enviar a Google Sheets via Sheet.best
    const response = await fetch(SHEETBEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Error al guardar en la hoja');

    // 3. Mostrar mensaje de éxito
    rsvpFeedback.innerHTML = '<span style="color:#7a8266;">✨ Confirmación enviada con éxito. ¡Gracias por formar parte de este día!</span>';
    setTimeout(() => { rsvpFeedback.innerHTML = ''; }, 5000);

    // 4. Enviar notificación por WhatsApp
    const mensajeWhatsApp = `
    *Notificación de Asistencia!!* 🎉🎊
    *Familia:* ${data.Familia}
    *Pases:* ${data.Pases}
    *Asistencia:* ${data.Asistencia}
    *Asistentes:* ${data.Asistentes}
    *Comentarios:* ${data.Comentarios}
    *Fecha:* ${data.Fecha}
    `.trim();

    const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensajeWhatsApp)}`;
    window.open(urlWhatsApp, '_blank'); // Abre WhatsApp en nueva pestaña

    // Limpiar comentarios (opcional)
    document.getElementById('comentarios').value = '';

  } catch (error) {
    console.error('Error al enviar RSVP:', error);
    rsvpFeedback.innerHTML = '<span style="color:#b56534;">❌ Ocurrió un error al enviar la confirmación. Intenta de nuevo.</span>';
  }
});

// Deshabilitar asistentes si selecciona "No"
asistenciaSelect.addEventListener('change', () => {
  if (asistenciaSelect.value === 'no') {
    asistentesNum.value = '0';
    asistentesNum.disabled = true;
  } else {
    asistentesNum.disabled = false;
    if (currentGuest) asistentesNum.max = currentGuest.pases;
  }
});

// ============================================================
// 12. TOGGLE DATOS DE TRANSFERENCIA (SECCIÓN REGALOS)
// ============================================================

const btnTransferencia = document.getElementById('btnTransferencia');
const transferenciaData = document.getElementById('transferenciaData');
let transferenciaVisible = false;

if (btnTransferencia && transferenciaData) {
  btnTransferencia.addEventListener('click', function() {
    if (!transferenciaVisible) {
      transferenciaData.style.display = 'grid';
      gsap.fromTo(transferenciaData,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" }
      );
      btnTransferencia.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar datos';
      transferenciaVisible = true;
    } else {
      gsap.to(transferenciaData, {
        opacity: 0,
        y: 20,
        scale: 0.97,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          transferenciaData.style.display = 'none';
        }
      });
      btnTransferencia.innerHTML = '<i class="fas fa-chevron-down"></i> Ver datos de transferencia';
      transferenciaVisible = false;
    }
  });
}

// ============================================================
// 13. SCROLL A RSVP (BOTÓN DEL HERO)
// ============================================================

if (scrollToRSVP) {
  scrollToRSVP.addEventListener('click', () => {
    const rsvpSection = document.getElementById('rsvp-section');
    if (rsvpSection) rsvpSection.scrollIntoView({ behavior: 'smooth' });
  });
}

// ============================================================
// 14. EVENTOS DE ACCESO
// ============================================================

submitBtn.addEventListener('click', handleAccess);
accessCodeInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAccess(); });

// ============================================================
// 15. INICIALIZACIÓN FINAL
// ============================================================

loadInvitados();