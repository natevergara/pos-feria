/* ============================================================
   POS FERIA — Terminal #01
   Vanilla ES6+ · sin dependencias · estado solo en memoria
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   Estado (en memoria, nunca persistido)
   ------------------------------------------------------------ */
const state = {
  items: [],        // [{ name, price }] — historial de venta
  total: 0,
  tendered: 0,      // billete seleccionado
  selectedBill: 0,  // mismo valor que tendered (para toggle)
};

/* ------------------------------------------------------------
   Referencias DOM
   ------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);

const els = {
  total: null,
  itemsBadge: null,
  tendered: null,
  change: null,
  changeLabel: null,
  changeCurrency: null,
  clock: null,
};

function cacheElements() {
  els.total = $('display-total');
  els.itemsBadge = $('items-badge');
  els.tendered = $('display-tendered');
  els.change = $('display-change');
  els.changeLabel = $('vuelto-label');
  els.changeCurrency = $('vuelto-currency');
  els.clock = $('terminal-clock');
}

function updateClock() {
  if (!els.clock) return;
  els.clock.textContent = new Date().toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */
const formatMoney = (value) => {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-CL');
};

/** Vibración corta y silenciosa si el dispositivo la soporta. */
function haptic(duration = 20) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(duration);
    }
  } catch (_) {
    /* Dispositivo/navegador sin soporte de vibración. */
  }
}

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */
function updateProductCounts() {
  // Contadores por producto a partir del historial
  const counts = new Map();
  for (const item of state.items) {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
  }

  // Se actualizan todos los badges presentes en el DOM
  for (const [name, count] of counts) {
    const badge = $('count-' + name);
    if (!badge) continue;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count <= 0);
  }

  // Los productos sin unidades vuelven a 0 / ocultos
  document.querySelectorAll('[id^="count-"]').forEach((badge) => {
    const name = badge.id.slice('count-'.length);
    if (!counts.has(name)) {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
  });
}

function updateItemsBadge() {
  if (!els.itemsBadge) return;
  const count = state.items.length;
  els.itemsBadge.textContent = count === 1 ? '1 artículo' : count + ' artículos';
}

function updateChangeDisplay() {
  if (!els.change) return;

  const diff = state.tendered - state.total;

  // Sin billete: vuelto en 0, estilo neutro/primary
  if (state.tendered <= 0) {
    els.change.textContent = '0';
    setChangeStyle('neutral');
    return;
  }

  if (diff >= 0) {
    // Billete suficiente → Vuelto (verde/primary)
    els.change.textContent = formatMoney(diff);
    setChangeStyle('vuelto');
  } else {
    // Billete insuficiente → Falta (error)
    els.change.textContent = formatMoney(Math.abs(diff));
    setChangeStyle('falta');
  }
}

/** Aplica color y etiqueta según Vuelto / Falta. */
function setChangeStyle(mode) {
  const isFalta = mode === 'falta';
  const isNeutral = mode === 'neutral';
  const color = isFalta ? '#ffb4ab' : (isNeutral ? '#a1a1aa' : '#4be277');

  if (els.changeLabel) els.changeLabel.textContent = isFalta ? 'Falta' : 'Vuelto';

  // Estilo del monto y del símbolo $
  if (els.change) {
    els.change.style.color = color;
    els.change.classList.toggle('text-primary', !isFalta && !isNeutral);
    els.change.classList.toggle('text-error', isFalta);
  }
  if (els.changeCurrency) {
    els.changeCurrency.style.color = color;
    els.changeCurrency.classList.toggle('text-primary', !isFalta && !isNeutral);
    els.changeCurrency.classList.toggle('text-error', isFalta);
  }
}

/** Resalta el botón del billete activo (estilos inline, sin depender de JIT). */
function updateBillSelection() {
  document.querySelectorAll('button[onclick^="handleTenderTap"]').forEach((btn) => {
    const match = /handleTenderTap\(\s*(\d+)\s*\)/.exec(btn.getAttribute('onclick') || '');
    if (!match) return;
    const amount = Number(match[1]);
    const active = amount > 0 && amount === state.selectedBill;

    if (active) {
      btn.style.borderColor = '#4be277';
      btn.style.backgroundColor = '#123a20';
      btn.style.color = '#4be277';
    } else {
      btn.style.borderColor = '';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function render() {
  if (els.total) els.total.textContent = formatMoney(state.total);
  if (els.tendered) els.tendered.textContent = formatMoney(state.tendered);

  updateItemsBadge();
  updateProductCounts();
  updateChangeDisplay();
  updateBillSelection();
}

/* ------------------------------------------------------------
   Acciones de venta
   ------------------------------------------------------------ */

/** Tocar producto: suma al total y agrega al historial. */
function handleProductTap(name, price) {
  haptic();

  const amount = Number(price);
  if (!Number.isFinite(amount)) return;

  state.items.push({ name: String(name), price: amount });
  state.total += amount;

  render();
}

/** Deshacer: quita el último ítem del historial. */
function handleUndo() {
  haptic();

  if (state.items.length === 0) {
    // Sin artículos, deshacer elimina el último dígito del pago anotado.
    state.tendered = Math.floor(state.tendered / 10);
    state.selectedBill = 0;
    render();
    return;
  }

  state.items.pop();
  state.total = state.items.reduce((sum, item) => sum + item.price, 0);

  // Si el billete ya no tiene sentido (venta vacía), se limpia
  if (state.items.length === 0) {
    state.tendered = 0;
    state.selectedBill = 0;
  }

  render();
}

/** Nuevo cliente: reinicia por completo la venta. */
function handleResetSale() {
  haptic();

  state.items = [];
  state.total = 0;
  state.tendered = 0;
  state.selectedBill = 0;
  setKeypadVisibility(false);

  render();
}

/** Anota un dígito del monto recibido (hasta seis dígitos). */
function handleKeypadDigit(digit) {
  const value = String(digit);
  if (!/^\d$/.test(value)) return;

  haptic(20);
  const current = state.tendered > 0 ? String(state.tendered) : '';
  if (current.length >= 6) return;

  state.tendered = Number(current + value);
  state.selectedBill = 0;
  render();
}

/** Borra el último dígito del monto anotado. */
function handleKeypadBackspace() {
  haptic(20);
  state.tendered = Math.floor(state.tendered / 10);
  state.selectedBill = 0;
  render();
}

/** Limpia el monto recibido anotado. */
function handleKeypadClear() {
  haptic(20);
  state.tendered = 0;
  state.selectedBill = 0;
  render();
}

function getKeypadContainer() {
  return $('keypad-container') || $('keypad-panel') || $('numeric-keypad') || $('keypad');
}

function setKeypadVisibility(visible) {
  const keypad = getKeypadContainer();
  if (!keypad) return;

  keypad.hidden = !visible;
  keypad.classList.toggle('hidden', !visible);
}

/** Alterna la visibilidad del teclado si la pantalla lo incluye. */
function toggleKeypad() {
  const keypad = getKeypadContainer();
  if (!keypad) return;

  const visible = !keypad.hidden && !keypad.classList.contains('hidden');
  setKeypadVisibility(!visible);
}

/** Tocar billete: alterna selección y calcula vuelto/falta. */
function handleTenderTap(amount) {
  haptic();

  const bill = Number(amount);
  if (!Number.isFinite(bill) || bill <= 0) return;

  if (state.tendered === bill && state.selectedBill === bill) {
    // Mismo billete → deseleccionar
    state.tendered = 0;
    state.selectedBill = 0;
  } else {
    state.tendered = bill;
    state.selectedBill = bill;
  }

  render();
}

/* ------------------------------------------------------------
   Screen WakeLock — mantener pantalla encendida
   ------------------------------------------------------------ */
let wakeLock = null;
let wakeLockPending = false;

async function requestWakeLock() {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

  // Ya activo: nada que hacer
  if (wakeLock && !wakeLock.released) return;
  if (wakeLockPending) return;

  wakeLockPending = true;
  try {
    wakeLock = await navigator.wakeLock.request('screen');

    wakeLock.addEventListener('release', () => {
      // El sistema puede liberarlo (pestaña en background, batería baja, etc.)
      wakeLock = null;
    });
  } catch (_) {
    // Bloqueado inicialmente (sin gesto de usuario, ahorro de energía, etc.)
    // Se reintenta en el primer pointerdown/click y al volver a ser visible.
    wakeLock = null;
  } finally {
    wakeLockPending = false;
  }
}

function installWakeLockRetries() {
  const retry = () => {
    requestWakeLock();
  };

  // El primer gesto del usuario desbloquea la solicitud en la mayoría de navegadores
  document.addEventListener('pointerdown', retry, { passive: true });
  document.addEventListener('click', retry, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });
}

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */
function init() {
  cacheElements();
  updateClock();
  window.setInterval(updateClock, 30_000);
  render();
  installWakeLockRetries();
  requestWakeLock(); // intento inmediato
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ------------------------------------------------------------
   Compatibilidad con los onclick="" del HTML
   ------------------------------------------------------------ */
window.handleProductTap = handleProductTap;
window.handleTenderTap = handleTenderTap;
window.handleUndo = handleUndo;
window.handleResetSale = handleResetSale;
window.handleKeypadDigit = handleKeypadDigit;
window.handleKeypadBackspace = handleKeypadBackspace;
window.handleKeypadClear = handleKeypadClear;
window.toggleKeypad = toggleKeypad;
