'use strict';

const GAS_URL        = 'https://script.google.com/macros/s/AKfycbz51JzOWD5tvKjioVlRWrD_QfPG0Jg-qj_iMpJeYYOrUcWfoMj3aVMN4upn03W4Z5yB/exec';
const SPREADSHEET_ID = '1QX4t8b79eZ2lPvsvmgiWxVHN557RSk_A9Rfj24rCBW4'; // ID spreadsheet

// ────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  muatProfil();
  autoGenerateNoInvoice();
  setTanggalHariIni();
  tambahItem(); // default 1 row
});

// ────────────────────────────────────────────────
// PROFIL PERUSAHAAN
// ────────────────────────────────────────────────
function simpanProfil(silent = false) {
  const profil = {
    namaPerusahaan:    getVal('namaPerusahaan'),
    alamatPerusahaan:  getVal('alamatPerusahaan'),
    teleponPerusahaan: getVal('teleponPerusahaan'),
    emailPerusahaan:   getVal('emailPerusahaan'),
    namaBank:          getVal('namaBank'),
    nomorRekening:     getVal('nomorRekening'),
  };

  if (!profil.namaPerusahaan.trim()) {
    if (!silent) showToast('⚠️ Nama perusahaan wajib diisi!', 'error');
    document.getElementById('namaPerusahaan')?.focus();
    return false;
  }

  localStorage.setItem('inv_profil', JSON.stringify(profil));

  // Show badge
  const badge = document.getElementById('profilBadge');
  if (badge) badge.style.display = '';

  if (!silent) showToast('✅ Profil berhasil disimpan!', 'success');
  return true;
}

function muatProfil() {
  const raw = localStorage.getItem('inv_profil');
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    setVal('namaPerusahaan',    p.namaPerusahaan    || '');
    setVal('alamatPerusahaan',  p.alamatPerusahaan  || '');
    setVal('teleponPerusahaan', p.teleponPerusahaan || '');
    setVal('emailPerusahaan',   p.emailPerusahaan   || '');
    setVal('namaBank',          p.namaBank          || '');
    setVal('nomorRekening',     p.nomorRekening     || '');

    // Show saved badge
    const badge = document.getElementById('profilBadge');
    if (badge && p.namaPerusahaan) badge.style.display = '';
  } catch (_) {}
}


// ────────────────────────────────────────────────
// AUTO NO. INVOICE
// ────────────────────────────────────────────────
function autoGenerateNoInvoice() {
  const d    = new Date();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const key  = `inv_counter_${yyyy}${mm}`;
  const next = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  setVal('noInvoice', `${String(next).padStart(3,'0')}/INV/${mm}/${yyyy}`);
}

function setTanggalHariIni() {
  setVal('tanggalInvoice', new Date().toISOString().split('T')[0]);
}

// ────────────────────────────────────────────────
// ITEM ROWS
// ────────────────────────────────────────────────
let itemCounter = 0;

function tambahItem() {
  itemCounter++;
  const id  = itemCounter;
  const box = document.getElementById('itemsContainer');
  if (!box) return;

  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = `itemRow_${id}`;
  row.innerHTML = `
    <input class="input" type="text"   id="desc_${id}"  placeholder="Nama jasa / produk" oninput="hitungTotals()" />
    <input class="input" type="number" id="harga_${id}" placeholder="0" min="0" oninput="hitungItem(${id})" />
    <input class="input" type="number" id="qty_${id}"   value="1" min="0"      oninput="hitungItem(${id})" />
    <div class="item-total-display" id="total_${id}">Rp 0</div>
    <button class="btn-remove" onclick="hapusItem(${id})" title="Hapus">✕</button>
  `;
  box.appendChild(row);
  hitungTotals();
}

function hapusItem(id) {
  const row = document.getElementById(`itemRow_${id}`);
  if (!row) return;
  row.style.opacity   = '0';
  row.style.transform = 'translateX(-10px)';
  row.style.transition = 'all .18s ease';
  setTimeout(() => { row.remove(); hitungTotals(); }, 200);
}

function hitungItem(id) {
  const h = parseFloat(document.getElementById(`harga_${id}`)?.value) || 0;
  const q = parseFloat(document.getElementById(`qty_${id}`)?.value)   || 0;
  const el = document.getElementById(`total_${id}`);
  if (el) el.textContent = formatRp(h * q);
  hitungTotals();
}

function hitungTotals() {
  let sub = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const id = row.id.split('_').pop();
    const h  = parseFloat(document.getElementById(`harga_${id}`)?.value) || 0;
    const q  = parseFloat(document.getElementById(`qty_${id}`)?.value)   || 0;
    sub += h * q;
    const el = document.getElementById(`total_${id}`);
    if (el) el.textContent = formatRp(h * q);
  });

  const pajak = pajakVisible ? (parseFloat(getVal('pajakInput')) || 0) : 0;
  setText('subtotalDisplay',    formatRp(sub));
  setText('grandTotalDisplay',  formatRp(sub + pajak));
}

// ────────────────────────────────────────────────
// TOGGLE PAJAK
// ────────────────────────────────────────────────
let pajakVisible = true;

function togglePajak() {
  pajakVisible = !pajakVisible;
  const input  = document.getElementById('pajakInput');
  const btn    = document.getElementById('btnTogglePajak');
  if (!input || !btn) return;

  if (pajakVisible) {
    input.style.display = '';
    btn.textContent = 'Sembunyikan';
  } else {
    input.style.display = 'none';
    btn.textContent = 'Tampilkan';
  }
  hitungTotals();
}

// ────────────────────────────────────────────────
// GENERATE → PINDAH KE INVOICE.HTML
// ────────────────────────────────────────────────
function generateInvoice() {
  // Auto-save profil perusahaan
  if (!simpanProfil(true)) {
    showToast('⚠️ Nama Perusahaan wajib diisi di bagian Profil Perusahaan!', 'error');
    document.getElementById('section-profil')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Validasi Klien & Invoice
  if (!getVal('namaKlien').trim()) {
    showToast('⚠️ Nama Klien wajib diisi!', 'error');
    document.getElementById('namaKlien')?.focus();
    return;
  }
  if (!getVal('noInvoice').trim()) {
    showToast('⚠️ No. Invoice wajib diisi!', 'error');
    document.getElementById('noInvoice')?.focus();
    return;
  }

  // Kumpulkan items
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const id  = row.id.split('_').pop();
    const desc  = document.getElementById(`desc_${id}`)?.value  || '';
    const harga = parseFloat(document.getElementById(`harga_${id}`)?.value) || 0;
    const qty   = parseFloat(document.getElementById(`qty_${id}`)?.value)   || 0;
    if (desc.trim() || harga > 0) {
      items.push({ desc, harga, qty, total: harga * qty });
    }
  });

  if (items.length === 0) {
    showToast('⚠️ Tambahkan minimal satu item / jasa!', 'error');
    document.getElementById('section-items')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Hitung total
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const pajak    = pajakVisible ? (parseFloat(getVal('pajakInput')) || 0) : 0;

  // Save counter index
  const d    = new Date();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const key  = `inv_counter_${yyyy}${mm}`;
  const curr = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(curr + 1));

  // Susun payload
  const data = {
    // Profil
    namaPerusahaan:    getVal('namaPerusahaan'),
    alamatPerusahaan:  getVal('alamatPerusahaan'),
    teleponPerusahaan: getVal('teleponPerusahaan'),
    emailPerusahaan:   getVal('emailPerusahaan'),
    namaBank:          getVal('namaBank'),
    nomorRekening:     getVal('nomorRekening'),
    // Klien
    namaKlien:         getVal('namaKlien'),
    alamatKlien:       getVal('alamatKlien'),
    kontakKlien:       getVal('kontakKlien'),
    // Invoice info
    noInvoice:         getVal('noInvoice'),
    tanggalInvoice:    getVal('tanggalInvoice'),
    jatuhTempo:        getVal('jatuhTempo'),
    pemohon:           getVal('pemohon'),
    perihal:           getVal('perihal'),
    // Items & totals
    items,
    subtotal,
    pajak,
    pajakVisible,
    grandTotal: subtotal + pajak,
    // Terms
    terms: getVal('termsInput'),
    // Timestamp
    createdAt: new Date().toISOString(),
    // Config
    spreadsheetId: SPREADSHEET_ID,
  };

  // Simpan ke localStorage lalu pindah halaman
  localStorage.setItem('inv_current', JSON.stringify(data));
  window.location.href = 'invoice.html';
}

// ────────────────────────────────────────────────
// COPY GAS CODE
// ────────────────────────────────────────────────
function copyGASCode() {
  const code = `function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Payload POST kosong.');
    }
    var data = JSON.parse(e.postData.contents);
    if (!data.spreadsheetId) {
      throw new Error('spreadsheetId belum dikirim.');
    }
    // Web App tidak selalu memiliki active spreadsheet; buka file secara eksplisit.
    var sheet = SpreadsheetApp.openById(data.spreadsheetId).getSheets()[0];
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Tanggal System", "No Invoice", "Tanggal Invoice", "Jatuh Tempo", 
        "Nama Klien", "Alamat Klien", "Perihal", "Pemohon", 
        "Subtotal", "Pajak", "Grand Total"
      ]);
    }
    
    sheet.appendRow([
      new Date(),
      data.noInvoice || '',
      data.tanggal || '',
      data.jatuhTempo || '',
      data.namaKlien || '',
      data.alamatKlien || '',
      data.perihal || '',
      data.pemohon || '',
      data.subtotal || 0,
      data.pajak || 0,
      data.grandTotal || 0
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  navigator.clipboard.writeText(code).then(() => {
    showToast('📋 Kode Apps Script berhasil dicopy!', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Kode Apps Script berhasil dicopy!', 'success');
  });
}

// ────────────────────────────────────────────────
// RESET FORM
// ────────────────────────────────────────────────
function resetForm() {
  if (!confirm('Reset semua data invoice?\n(Profil perusahaan tidak ikut direset)')) return;

  ['namaKlien','alamatKlien','kontakKlien',
   'noInvoice','tanggalInvoice','jatuhTempo','pemohon','perihal',
   'pajakInput','termsInput'].forEach(id => setVal(id, ''));

  setVal('pajakInput', '0');
  setVal('termsInput', 'All payments should be transferred to the account above no later than the due date.');

  const container = document.getElementById('itemsContainer');
  if (container) container.innerHTML = '';
  itemCounter = 0;

  if (!pajakVisible) togglePajak();

  autoGenerateNoInvoice();
  setTanggalHariIni();
  tambahItem();
  showToast('🔄 Form berhasil direset!', 'info');
}

// ────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────
function getVal(id) { return document.getElementById(id)?.value || ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }

function formatRp(n) {
  if (isNaN(n)) n = 0;
  return 'Rp\u00a0' + Math.round(n).toLocaleString('id-ID');
}

// ────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────
let _toast;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(_toast);
  el.textContent = msg;
  el.className = `toast ${type}`;
  void el.offsetWidth;
  el.classList.add('show');
  _toast = setTimeout(() => el.classList.remove('show'), 3800);
}
