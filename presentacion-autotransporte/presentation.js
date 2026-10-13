const slides = [...document.querySelectorAll('.slide')];
const current = document.querySelector('#current');
const total = document.querySelector('#total');
const bar = document.querySelector('#bar');
const panel = document.querySelector('#speakerPanel');
const speakerText = document.querySelector('#speakerText');
let index = Math.max(0, Math.min(slides.length - 1, Number(location.hash.slice(1)) - 1 || 0));

total.textContent = String(slides.length).padStart(2, '0');

function show(next) {
  index = (next + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
  current.textContent = String(index + 1).padStart(2, '0');
  bar.style.width = `${((index + 1) / slides.length) * 100}%`;
  speakerText.textContent = slides[index].querySelector('.notes')?.textContent.trim() || '';
  document.title = `${slides[index].dataset.title} — Ruta Conecta`;
  history.replaceState(null, '', `#${index + 1}`);
}

document.querySelector('#prev').addEventListener('click', () => show(index - 1));
document.querySelector('#next').addEventListener('click', () => show(index + 1));
document.querySelector('#notesBtn').addEventListener('click', toggleNotes);
document.querySelector('#fullscreen').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

function toggleNotes() {
  panel.classList.toggle('show');
  document.querySelector('#notesBtn').setAttribute('aria-pressed', panel.classList.contains('show'));
}

addEventListener('keydown', event => {
  if (event.target.isContentEditable) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) show(index + 1);
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) show(index - 1);
  if (event.key.toLowerCase() === 'n') toggleNotes();
  if (event.key.toLowerCase() === 'f') document.querySelector('#fullscreen').click();
  if (event.key === 'Home') show(0);
  if (event.key === 'End') show(slides.length - 1);
});

let startX = 0;
addEventListener('touchstart', event => startX = event.changedTouches[0].clientX, { passive: true });
addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - startX;
  if (Math.abs(delta) > 50) show(index + (delta < 0 ? 1 : -1));
}, { passive: true });

show(index);
