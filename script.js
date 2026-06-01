// Base de datos desde JSON externo
let invitadosDB = {};
let currentGuest = null;
let countdownInterval = null; // para evitar múltiples intervalos

// Elementos DOM
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

// Cargar invitados desde JSON
async function loadInvitados() {
  try {
    const response = await fetch('data/invitados.json');
    const data = await response.json();
    invitadosDB = data;
    restoreSession();
  } catch (error) {
    console.error('Error cargando invitados.json', error);
    invitadosDB = {
      "1025": { familia: "Familia González", pases: 4 },
      "2040": { familia: "Andrea Martínez", pases: 2 }
    };
    restoreSession();
  }
}

// CONTADOR REGRESIVO (3 oct 2026, 14:00 CST = 20:00 UTC)
function initCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const targetUTC = Date.UTC(2026, 9, 3, 20, 0, 0); // Octubre es mes 9

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
      // animación suave en segundos
      secElem.style.transform = 'scale(1.1)';
      setTimeout(() => { if(secElem) secElem.style.transform = 'scale(1)'; }, 200);
    }
  }

  updateNumbers();
  countdownInterval = setInterval(updateNumbers, 1000);
}

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
      initCountdown(); // Iniciar contador
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
      initCountdown(); // Iniciar contador si ya hay sesión
      gsap.to(mainContent, { opacity: 1, duration: 0.8 });
      tryAutoMusic();
      return;
    }
  }
  accessScreen.style.display = 'flex';
  mainContent.style.display = 'none';
}

// RSVP
rsvpForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentGuest) return;
  const asistencia = asistenciaSelect.value;
  let asistentes = parseInt(asistentesNum.value) || 0;
  const max = currentGuest.pases;
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
  console.log(`RSVP: ${currentGuest.familia}, Asiste: ${asistencia}, Personas: ${asistentes}, comentarios: ${comentarios}`);
  rsvpFeedback.innerHTML = '<span style="color:#7a8266;">✨ Confirmación enviada con éxito. ¡Gracias por formar parte de este día!</span>';
  setTimeout(() => { rsvpFeedback.innerHTML = ''; }, 4000);
});

asistenciaSelect.addEventListener('change', () => {
  if (asistenciaSelect.value === 'no') {
    asistentesNum.value = '0';
    asistentesNum.disabled = true;
  } else {
    asistentesNum.disabled = false;
    if (currentGuest) asistentesNum.max = currentGuest.pases;
  }
});

if (scrollToRSVP) {
  scrollToRSVP.addEventListener('click', () => {
    const rsvpSection = document.getElementById('rsvp-section');
    if (rsvpSection) rsvpSection.scrollIntoView({ behavior: 'smooth' });
  });
}

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
      opacity: 1, y: 0, duration: 1.2, scrollTrigger: { trigger: section, start: "top 85%", toggleActions: "play none none reverse" }
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

let mapInitialized = false;
function initMap() {
  if (typeof L !== 'undefined' && document.getElementById('mapContainer') && !mapInitialized) {
    const map = L.map('mapContainer').setView([19.219239275291123, -99.63259517864687], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);
    L.marker([19.219239275291123, -99.63259517864687]).addTo(map).bindPopup('Loma Linda Jardin Social · Metepec, Méx.').openPopup();
    mapInitialized = true;
  }
}

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

// Música
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
      musicBtn.innerHTML = '<i class="fas fa-music"></i> <span>♫ Ambient</span>';
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

// Event Listeners de acceso
submitBtn.addEventListener('click', handleAccess);
accessCodeInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAccess(); });

// Inicializar cargando JSON
loadInvitados();