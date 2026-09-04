'use strict';

const GAS_URL        = 'https://script.google.com/macros/s/AKfycbxHtz4VnK7fBF7rA6ld5CCAjgGyXPWX4oqP__Q1VxnZ1NX8yiGUVjYFBDYrHPJhjIlv/exec';
const SPREADSHEET_ID = '1Lrdd3wrPHZneDly_iStPJRxq9mfQy2p5eWm3B64U16Y'; // ID spreadsheet

// ────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  translateUI();
  muatProfil();
  autoGenerateNoInvoice();
  setTanggalHariIni();
  tambahItem(); // default 1 row
});

// English UI labels (keeps the data model/API field names unchanged).
function translateUI() {
  const replacements = {
    'Generator Invoice Profesional':'Professional Invoice Generator',
    'Isi Form':'Fill Form', 'Hasil Invoice':'Invoice Result',
    'Profil Perusahaan':'Company Profile',
    'Tersimpan otomatis di browser — tidak perlu isi ulang':'Automatically saved in your browser — no need to re-enter',
    'Tersimpan':'Saved', 'Nama Perusahaan / Usaha':'Company / Business Name',
    'Nama perusahaan':'Company name', 'Alamat Perusahaan':'Company Address',
    'Telepon':'Phone', 'Nama Bank':'Bank Name', 'Nomor Rekening':'Account Number',
    'Simpan Profil':'Save Profile', 'Data Klien':'Client Details',
    'Informasi penerima invoice':'Invoice recipient information',
    'Nama Klien / Perusahaan Klien':'Client / Client Company Name',
    'Alamat Klien':'Client Address', 'Telepon / Email Klien':'Client Phone / Email',
    'Info Invoice':'Invoice Information', 'Nomor, tanggal, dan detail invoice':'Invoice number, date, and details',
    'No. Invoice':'Invoice No.', 'Tanggal Invoice':'Invoice Date', 'Jatuh Tempo':'Due Date',
    'Pemohon':'Requested By', 'Nama pemohon invoice':'Invoice requester name',
    'Deskripsi singkat pekerjaan, contoh: Jasa Desain Logo...':'Brief work description, e.g. Logo Design Service...',
    'Item / Jasa':'Items / Services', 'Daftar produk atau layanan yang ditagihkan':'Products or services being billed',
    'Deskripsi':'Description', 'Harga Satuan':'Unit Price', 'Jumlah':'Amount',
    'Tambah Item':'Add Item', 'Sembunyikan':'Hide', 'Tampilkan':'Show',
    'Lihat Hasil Invoice':'View Invoice', 'Reset Form':'Reset Form',
    'Syarat dan ketentuan pembayaran':'Payment terms and conditions'
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { let t = node.nodeValue; Object.keys(replacements).forEach(k => { t = t.split(k).join(replacements[k]); }); node.nodeValue = t; });
  document.querySelectorAll('[placeholder]').forEach(el => { Object.keys(replacements).forEach(k => { if (el.placeholder === k) el.placeholder = replacements[k]; }); });
  const text = (sel, value) => document.querySelectorAll(sel).forEach(el => { el.textContent = value; });
  text('.brand-sub', 'Professional Invoice Generator');
  text('#section-profil .card-title', 'Company Profile');
  text('#section-profil .card-desc', 'Saved automatically online — available on all devices');
  text('#section-klien .card-title', 'Client Details');
  text('#section-klien .card-desc', 'Invoice recipient information');
  text('#section-info .card-title', 'Invoice Information');
  text('#section-items .card-title', 'Items / Services');
  text('#section-items .card-desc', 'Products or services being billed');
  text('#btnSimpanProfil', '💾  Save Profile');
  text('#btnGenerateInvoice', '🧾  View Invoice');
  text('#btnTogglePajak', 'Hide');
  const fields = { namaPerusahaan:'Company name', alamatPerusahaan:'Company address', namaBank:'Bank name', pemohon:'Invoice requester name', perihal:'Brief work description, e.g. Logo Design Service...' };
  Object.entries(fields).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.placeholder = value; });
  document.querySelectorAll('.ih-desc').forEach(el => el.textContent = 'Description');
  document.querySelectorAll('.ih-price').forEach(el => el.textContent = 'Unit Price');
  document.querySelectorAll('.ih-total').forEach(el => el.textContent = 'Amount');
}

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

  // Sinkronkan ke Google Sheets agar profil tersedia di perangkat lain.
  fetch(GAS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveProfile', spreadsheetId: SPREADSHEET_ID, profile: profil })
  }).catch(err => console.warn('Profil online gagal disimpan:', err));

  // Show badge
  const badge = document.getElementById('profilBadge');
  if (badge) badge.style.display = '';

  if (!silent) showToast('✅ Profil berhasil disimpan!', 'success');
  return true;
}

function terapkanProfil(p) {
  if (!p) return;
  setVal('namaPerusahaan', p.namaPerusahaan || '');
  setVal('alamatPerusahaan', p.alamatPerusahaan || '');
  setVal('teleponPerusahaan', p.teleponPerusahaan || '');
  setVal('emailPerusahaan', p.emailPerusahaan || '');
  setVal('namaBank', p.namaBank || '');
  setVal('nomorRekening', p.nomorRekening || '');
  const badge = document.getElementById('profilBadge');
  if (badge && p.namaPerusahaan) badge.style.display = '';
}

function muatProfil() {
  const raw = localStorage.getItem('inv_profil');
  let profilLokal = null;
  try { if (raw) profilLokal = JSON.parse(raw); } catch (_) {}

  // JSONP dipakai karena Web App biasanya tidak mengirim header CORS.
  const cb = `profilCallback_${Date.now()}`;
  let remoteBerhasil = false;
  window[cb] = (p) => {
    if (p && p.namaPerusahaan) {
      remoteBerhasil = true;
      terapkanProfil(p);
      localStorage.setItem('inv_profil', JSON.stringify(p));
    }
    cleanup();
  };
  const cleanup = () => { delete window[cb]; script.remove(); };
  const script = document.createElement('script');
  script.src = `${GAS_URL}?action=getProfile&spreadsheetId=${encodeURIComponent(SPREADSHEET_ID)}&callback=${cb}&t=${Date.now()}`;
  script.onerror = cleanup;
  document.head.appendChild(script);
  // Gunakan cache lokal hanya jika server tidak merespons.
  setTimeout(() => {
    if (!remoteBerhasil && profilLokal) terapkanProfil(profilLokal);
    cleanup();
  }, 4000);
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
    btn.textContent = 'Hide';
  } else {
    input.style.display = 'none';
    btn.textContent = 'Show';
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
  const code = `function doGet(e) {
  var p = e.parameter || {};
  var result = {};
  if (p.action === 'getProfile') {
    var sheet = SpreadsheetApp.openById(p.spreadsheetId).getSheetByName('Profil');
    if (sheet && sheet.getLastRow() > 1) {
      var row = sheet.getRange(2, 1, 1, 6).getValues()[0];
      result = { namaPerusahaan: row[0], alamatPerusahaan: row[1], teleponPerusahaan: row[2], emailPerusahaan: row[3], namaBank: row[4], nomorRekening: row[5] };
    }
  }
  var json = JSON.stringify(result);
  return ContentService.createTextOutput((p.callback || 'callback') + '(' + json + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
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

    if (data.action === 'saveProfile') {
      var profileSheet = SpreadsheetApp.openById(data.spreadsheetId).getSheetByName('Profil') || SpreadsheetApp.openById(data.spreadsheetId).insertSheet('Profil');
      if (profileSheet.getLastRow() === 0) profileSheet.appendRow(['Nama Perusahaan','Alamat','Telepon','Email','Nama Bank','Nomor Rekening']);
      var p = data.profile || {};
      var values = [[p.namaPerusahaan || '', p.alamatPerusahaan || '', p.teleponPerusahaan || '', p.emailPerusahaan || '', p.namaBank || '', p.nomorRekening || '']];
      if (profileSheet.getLastRow() < 2) profileSheet.getRange(2, 1, 1, 6).setValues(values); else profileSheet.getRange(2, 1, 1, 6).setValues(values);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
