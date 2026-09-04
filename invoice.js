/* ════════════════════════════════════════════════
   invoice.js — Invoice result page (invoice.html)
   ════════════════════════════════════════════════ */
"use strict";

// ────────────────────────────────────────────────
// ⚙️  KONFIGURASI — samakan dengan app.js
// ────────────────────────────────────────────────
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxHtz4VnK7fBF7rA6ld5CCAjgGyXPWX4oqP__Q1VxnZ1NX8yiGUVjYFBDYrHPJhjIlv/exec";

let INV = null; // current invoice data

document.addEventListener("DOMContentLoaded", () => {
  translateInvoiceUI();
  const raw = localStorage.getItem("inv_current");
  if (!raw) {
    showNoDataBanner();
    return;
  }
  try {
    INV = JSON.parse(raw);
    renderInvoice(INV);
    setGeneratedTime(INV.createdAt);
  } catch (e) {
    console.error("Gagal parse data invoice:", e);
    showNoDataBanner();
  }
});

function translateInvoiceUI() {
  const map = {
    'Generator Invoice Profesional':'Professional Invoice Generator',
    'Isi Form':'Fill Form', 'Hasil Invoice':'Invoice Result',
    'Kembali Edit Form':'Back to Edit Form', 'Cetak / Print':'Print',
    'Kirim ke Sheet':'Send to Sheet', 'Download PDF':'Download PDF',
    'Detail Invoice':'Invoice Details', 'Tanggal':'Date', 'Jatuh Tempo':'Due Date',
    'Perihal':'Subject', 'Pemohon':'Requested By', 'Deskripsi':'Description',
    'Harga Satuan':'Unit Price', 'Jumlah':'Amount', 'Dibuat dengan':'Created with',
    'Informasi Pembayaran':'Payment Information'
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { let t = node.nodeValue; Object.keys(map).forEach(k => { t = t.split(k).join(map[k]); }); node.nodeValue = t; });
  const text = (sel, value) => document.querySelectorAll(sel).forEach(el => { el.textContent = value; });
  text('.brand-sub', 'Professional Invoice Generator');
  text('#btnCetak', '🖨  Print');
  text('#btnKirimSheet', '📊  Send to Sheets');
  text('#btnDownloadPDF', '⬇  Download PDF');
  text('.inv-meta-label', 'Invoice Details');
  document.querySelectorAll('.inv-det-k').forEach((el, i) => { el.textContent = ['Invoice No.','Date','Due Date','Subject','Requested By'][i] || el.textContent; });
  document.querySelectorAll('.inv-th').forEach((el, i) => { el.textContent = ['Description','Unit Price','QTY','Amount'][i] || el.textContent; });
}

// ────────────────────────────────────────────────
// RENDER INVOICE
// ────────────────────────────────────────────────
function renderInvoice(d) {
  // ── Toolbar ──
  setText("toolbar-noInv", `Invoice #${d.noInvoice || "—"}`);

  // ── Header perusahaan ──
  setText("doc-namaPerusahaan", d.namaPerusahaan || "—");
  setText("doc-alamatPerusahaan", d.alamatPerusahaan || "");

  const kontakBaris = [d.teleponPerusahaan, d.emailPerusahaan]
    .filter(Boolean)
    .join("  |  ");
  setText("doc-kontakPerusahaan", kontakBaris);

  // ── Bill To ──
  setText("doc-namaKlien", d.namaKlien || "—");
  setText("doc-alamatKlien", d.alamatKlien || "");
  setText("doc-kontakKlien", d.kontakKlien || "");

  // ── Invoice Details ──
  setText("doc-noInvoice", d.noInvoice || "—");
  setText("doc-tanggal", formatTanggal(d.tanggalInvoice));
  setText("doc-jatuhTempo", formatTanggal(d.jatuhTempo) || "—");

  // Perihal & pemohon (reset display appropriately)
  const rowPerihal = document.getElementById("doc-perihalRow");
  if (d.perihal && d.perihal.trim()) {
    if (rowPerihal) rowPerihal.style.display = "";
    setText("doc-perihal", d.perihal);
  } else {
    if (rowPerihal) rowPerihal.style.display = "none";
  }

  const rowPemohon = document.getElementById("doc-pemohonRow");
  if (d.pemohon && d.pemohon.trim()) {
    if (rowPemohon) rowPemohon.style.display = "";
    setText("doc-pemohon", d.pemohon);
  } else {
    if (rowPemohon) rowPemohon.style.display = "none";
  }

  // ── Items ──
  const tbody = document.getElementById("doc-itemsBody");
  if (tbody) {
    tbody.innerHTML = "";

    if (!d.items || d.items.length === 0) {
      tbody.innerHTML = `<tr>
        <td class="inv-td inv-td-desc" colspan="4" style="text-align:center;color:var(--n400);font-style:italic">Tidak ada item</td>
      </tr>`;
    } else {
      d.items.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="inv-td inv-td-desc">${escHtml(item.desc) || '<em style="opacity:.4">—</em>'}</td>
          <td class="inv-td inv-td-r">${formatRp(item.harga)}</td>
          <td class="inv-td inv-td-r">${item.qty}</td>
          <td class="inv-td inv-td-r">${formatRp(item.total)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // ── Totals ──
  setText("doc-subtotal", formatRp(d.subtotal || 0));
  setText("doc-grandTotal", formatRp(d.grandTotal || 0));

  // Pajak row
  const taxRow = document.getElementById("doc-taxRow");
  if (d.pajakVisible && d.pajak > 0) {
    if (taxRow) taxRow.style.display = "";
    setText("doc-pajak", formatRp(d.pajak));
  } else {
    if (taxRow) taxRow.style.display = "none";
  }

  // ── Terms & Bank ──
  setText("doc-terms", d.terms || "");

  const bankNameStr = d.namaBank
    ? `Bank: ${d.namaBank}${d.namaPerusahaan ? " (" + d.namaPerusahaan + ")" : ""}`
    : "";
  const bankNumStr = d.nomorRekening ? `No. Rek: ${d.nomorRekening}` : "";
  setText("doc-bankName", bankNameStr);
  setText("doc-bankNum", bankNumStr);
}

// ────────────────────────────────────────────────
// DOWNLOAD PDF
// ────────────────────────────────────────────────
async function downloadPDF() {
  const btn = document.getElementById("btnDownloadPDF");
  const note = document.getElementById("generatedNote");
  const doc = document.getElementById("invoiceDoc");

  if (!doc) {
    showToast("❌ Dokumen invoice tidak ditemukan.", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Memproses…";
  }
  showToast("📄 Membuat PDF, mohon tunggu…", "info");

  // Sembunyikan note/watermark sementara
  if (note) note.style.visibility = "hidden";

  try {
    // html2canvas render dengan kloning untuk menghindari masalah breakpoint media query (max-width: 960px)
    const canvas = await html2canvas(doc, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        const clonedInvoice = clonedDoc.getElementById("invoiceDoc");
        if (clonedInvoice) {
          clonedInvoice.style.width = "800px";
          clonedInvoice.style.margin = "0 auto";
          clonedInvoice.style.boxShadow = "none";
        }
      },
    });

    if (note) note.style.visibility = "";

    const imgData = canvas.toDataURL("image/png");
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (!jsPDFClass) {
      throw new Error("Library jsPDF belum termuat.");
    }

    const pdfW = 210; // mm
    const pdfH = 297; // mm
    const imgH = (canvas.height * pdfW) / canvas.width;

    const pdf = new jsPDFClass("p", "mm", "a4");
    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfW, imgH);
    heightLeft -= pdfH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfW, imgH);
      heightLeft -= pdfH;
    }

    const noInv = (INV?.noInvoice || "invoice").replace(/[\/\\]/g, "-");
    const klien = (INV?.namaKlien || "klien")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "");
    const fname = `Invoice_${noInv}_${klien}.pdf`;

    pdf.save(fname);
    showToast(`✅ PDF berhasil diunduh: ${fname}`, "success");
  } catch (err) {
    console.error("PDF Error:", err);
    if (note) note.style.visibility = "";
    showToast("⚠️ Menggunakan dialog Cetak Browser...", "info");
    setTimeout(() => {
      window.print();
    }, 800);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⬇ Download PDF";
    }
  }
}

function cetakInvoice() {
  window.print();
}

// ────────────────────────────────────────────────
// KIRIM KE GOOGLE SHEET
// ────────────────────────────────────────────────
async function kirimKeSheet() {
  if (!GAS_URL || GAS_URL === "PASTE_URL_GOOGLE_APPS_SCRIPT_DISINI") {
    showToast("⚠️ URL Google Apps Script belum dikonfigurasi!", "error");
    return;
  }
  if (!INV) {
    showToast("⚠️ Tidak ada data invoice.", "error");
    return;
  }

  const btn = document.getElementById("btnKirimSheet");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Mengirim…";
  }
  showToast("📊 Mengirim data ke Google Sheet…", "info");

  const payload = {
    noInvoice: INV.noInvoice,
    tanggal: INV.tanggalInvoice,
    jatuhTempo: INV.jatuhTempo,
    namaKlien: INV.namaKlien,
    alamatKlien: INV.alamatKlien,
    perihal: INV.perihal,
    pemohon: INV.pemohon,
    subtotal: INV.subtotal,
    pajak: INV.pajak,
    grandTotal: INV.grandTotal,
    spreadsheetId: INV.spreadsheetId || "",
  };

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    showToast("✅ Data berhasil dikirim ke Google Sheet!", "success");
  } catch (err) {
    console.error("Sheet send error:", err);
    showToast(
      '❌ Gagal mengirim. Pastikan Apps Script dipublish untuk "Anyone".',
      "error",
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📊 Kirim ke Sheet";
    }
  }
}

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
function formatRp(n) {
  if (isNaN(n)) n = 0;
  return "Rp\u00a0" + Math.round(n).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function escHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setGeneratedTime(iso) {
  const el = document.getElementById("generatedTime");
  if (!el) return;
  try {
    const d = iso ? new Date(iso) : new Date();
    el.textContent = d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    el.textContent = new Date().toLocaleString("id-ID");
  }
}

function showNoDataBanner() {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;
      justify-content:center;background:#1e1b4b;color:#fff;font-family:Inter,sans-serif;
      text-align:center;padding:2rem;gap:1rem;">
      <div style="font-size:3rem;">📄</div>
      <h2 style="font-size:1.4rem;font-weight:700;">Belum ada data invoice</h2>
      <p style="color:rgba(255,255,255,.6);max-width:320px;line-height:1.6">
        Isi form terlebih dahulu, lalu klik "Lihat Hasil Invoice"
      </p>
      <a href="index.html"
         style="margin-top:.5rem;background:#f59e0b;color:#1e1b4b;font-weight:700;
           padding:.75rem 1.75rem;border-radius:8px;text-decoration:none;font-size:.95rem;">
        ← Kembali ke Form
      </a>
    </div>`;
}

// ────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  const translations = {
    "Tidak ada data invoice.": "No invoice data available.",
    "Data berhasil dikirim ke Google Sheet!": "Data sent to Google Sheets successfully!",
    "Mengirim data ke Google Sheet…": "Sending data to Google Sheets…",
    "URL Google Apps Script belum dikonfigurasi!": "Google Apps Script URL is not configured.",
    "Dokumen invoice tidak ditemukan.": "Invoice document not found.",
    "Membuat PDF, mohon tunggu…": "Creating PDF, please wait…",
    "Menggunakan dialog Cetak Browser...": "Using the browser print dialog…"
  };
  Object.keys(translations).forEach(k => { msg = msg.replace(k, translations[k]); });
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = `toast ${type}`;
  void el.offsetWidth;
  el.classList.add("show");
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
}
