/**
 * Code.gs — Walk folder Google Drive → upsert ke hasil_bulanan_src
 *
 * ENTRY POINTS:
 *   syncUtara()          — uji dulu untuk 1 wilayah (UTARA, 6 PO)
 *   syncSemuaWilayah()   — walk semua wilayah (untuk aktifkan selepas UTARA lulus)
 *   syncPO(poName, tahun) — sync 1 PO sahaja (untuk debug)
 *
 * TRIGGER:
 *   Pasang time-driven trigger harian pada syncSemuaWilayah()
 *   (Project → Triggers → Add Trigger → syncSemuaWilayah / Day timer / 2am-3am)
 */

// ===== ENTRY POINTS =====

function syncUtara(tahun) {
  return syncWilayah('UTARA', tahun);
}

function syncSemuaWilayah(tahun) {
  var log = [];
  ['UTARA','TENGAH','TIMUR','SELATAN'].forEach(function(w) {
    try {
      var res = syncWilayah(w, tahun);
      log.push(res);
    } catch (err) {
      log.push({ wilayah: w, error: err.toString() });
    }
  });
  tulisLogAudit('SYNC_SEMUA', log);
  return log;
}

function syncPO(poCanonical, tahun) {
  var creds = getSupabaseCreds();
  tahun = tahun || creds.tahunDefault;

  // Cari PO folder dalam mana-mana wilayah
  var wilayah = cariWilayahUntukPO(poCanonical);
  if (!wilayah) throw new Error('PO tidak dikenalpasti: ' + poCanonical);

  var folderId = CONFIG.WILAYAH_FOLDER_IDS[wilayah];
  if (!folderId) {
    // Fallback: walk dari root
    folderId = creds.rootFolderId;
  }

  var folder = DriveApp.getFolderById(folderId);
  var poFolders = cariPODiFolder(folder, poCanonical);
  if (poFolders.length === 0) {
    throw new Error('Folder PO tidak dijumpai: ' + poCanonical);
  }

  var rows = [];
  poFolders.forEach(function(pf) {
    var spreadsheets = pf.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (spreadsheets.hasNext()) {
      var file = spreadsheets.next();
      var ss = SpreadsheetApp.openById(file.getId());
      var extracted = extractSemuaSheet(ss, poCanonical, wilayah, tahun);
      rows = rows.concat(extracted);
    }
  });

  if (rows.length === 0) {
    Logger.log('Tiada baris diekstrak dari PO ' + poCanonical);
    return { po: poCanonical, baris: 0 };
  }

  var res = upsertBatch(rows);
  tulisLogAudit('SYNC_PO', { po: poCanonical, wilayah: wilayah, tahun: tahun, baris: rows.length, hasil: res });
  return { po: poCanonical, wilayah: wilayah, tahun: tahun, baris: rows.length };
}

// ===== WALK FOLDER =====

function syncWilayah(wilayah, tahun) {
  var creds = getSupabaseCreds();
  tahun = tahun || creds.tahunDefault;

  var folderId = CONFIG.WILAYAH_FOLDER_IDS[wilayah];
  if (!folderId) {
    // Cuba walk dari root HQ
    folderId = creds.rootFolderId;
  }

  var folder = DriveApp.getFolderById(folderId);
  if (!folder) throw new Error('Folder wilayah tidak dijumpai: ' + wilayah);

  // Kalau folder ini BUKAN folder wilayah (root HQ), cari subfolder ikut nama
  if (folder.getName().toUpperCase() !== wilayah) {
    var sub = folder.getFoldersByName(wilayah);
    if (sub.hasNext()) {
      folder = sub.next();
    } else {
      // Cuba loop semua subfolder yang nama match
      Logger.log('Folder ' + wilayah + ' tidak dijumpai dalam root, cuba root terus');
    }
  }

  var pos = CONFIG.PO_WILAYAH[wilayah] || [];
  var semuaBaris = [];

  pos.forEach(function(poCanonical) {
    try {
      var poFolders = cariPODiFolder(folder, poCanonical);
      poFolders.forEach(function(pf) {
        // Mungkin folder atau spreadsheet terus
        var spreadsheets = pf.getFilesByType(MimeType.GOOGLE_SHEETS);
        while (spreadsheets.hasNext()) {
          var file = spreadsheets.next();
          var ss = SpreadsheetApp.openById(file.getId());
          var rows = extractSemuaSheet(ss, poCanonical, wilayah, tahun);
          semuaBaris = semuaBaris.concat(rows);
        }
      });
    } catch (err) {
      Logger.log('Skip PO %s: %s', poCanonical, err.toString());
    }
  });

  if (semuaBaris.length === 0) {
    Logger.log('Wilayah ' + wilayah + ': tiada baris diekstrak');
    return { wilayah: wilayah, baris: 0 };
  }

  var res = upsertBatch(semuaBaris);
  tulisLogAudit('SYNC_WILAYAH', { wilayah: wilayah, tahun: tahun, baris: semuaBaris.length, hasil: res });
  return { wilayah: wilayah, tahun: tahun, baris: semuaBaris.length };
}

function cariPODiFolder(parentFolder, poCanonical) {
  // Cuba match folder exact
  var matches = parentFolder.getFoldersByName(poCanonical);
  if (matches.hasNext()) {
    var arr = [];
    while (matches.hasNext()) arr.push(matches.next());
    return arr;
  }
  // Cuba match nama kanonik dari raw
  var alt = Object.keys(CONFIG.PO_CANONICAL_MAP).find(function(k) {
    return CONFIG.PO_CANONICAL_MAP[k] === poCanonical && k !== poCanonical;
  });
  if (alt) {
    var m2 = parentFolder.getFoldersByName(alt);
    if (m2.hasNext()) {
      var arr = [];
      while (m2.hasNext()) arr.push(m2.next());
      return arr;
    }
  }
  return [];
}

function cariWilayahUntukPO(poCanonical) {
  for (var w in CONFIG.PO_WILAYAH) {
    if (CONFIG.PO_WILAYAH[w].indexOf(poCanonical) >= 0) return w;
  }
  return null;
}

// ===== EXTRACT DARI SHEET =====

function extractSemuaSheet(ss, poCanonical, wilayah, tahun) {
  var allRows = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var rows = extractBlokDariSheet(sheet, poCanonical, wilayah, tahun);
    allRows = allRows.concat(rows);
  }
  return allRows;
}

function extractBlokDariSheet(sheet, poCanonical, wilayah, tahun) {
  var data = sheet.getDataRange().getValues();
  var out = [];
  var blokAktif = null; // { jenis, unit }

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var firstCell = (row[0] || '').toString().trim().toUpperCase();

    // Detect block marker "HASIL SAWIT" atau "HASIL GETAH"
    if (firstCell.indexOf('HASIL SAWIT') >= 0) {
      blokAktif = CONFIG.BLOCK_MARKERS['HASIL SAWIT'];
      continue;
    }
    if (firstCell.indexOf('HASIL GETAH') >= 0) {
      blokAktif = CONFIG.BLOCK_MARKERS['HASIL GETAH'];
      continue;
    }

    // Stop bila jumpa JUMLAH atau baris kosong dalam block
    if (blokAktif && (
      firstCell === '' ||
      firstCell === 'JUMLAH' ||
      /^JUMLAH\s/i.test(firstCell)
    )) {
      blokAktif = null;
      continue;
    }

    if (!blokAktif) continue;

    // Baris projek: lajur 1 = NAMA PROJEK (kolum B), lajur 2 = LUAS BERHASIL
    var namaProjek = (row[1] || '').toString().trim();
    var luasBerhasil = Number(row[2]) || 0;

    // Tapis baris tidak relevan
    if (!namaProjek) continue;
    if (/^(bil\.?|nama\s+projek|pol\s*[\/]?\s*p\.?n\.?)$/i.test(namaProjek)) continue;
    if (/^TSK\s/i.test(namaProjek) === false &&
        /^(LADANG|OA|AGRO|PKS|TSK)/i.test(namaProjek) === false) {
      // Bukan nama projek (cth "BIL", header)
      continue;
    }

    // Loop 12 bulan
    for (var b = 0; b < 12; b++) {
      var kolum = CONFIG.BULAN_KOLUM_MULA + b;
      var rawVal = row[kolum];
      if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
      var val = Number(rawVal);
      if (isNaN(val) || val === 0) continue;

      out.push({
        tahun               : tahun,
        jenis               : blokAktif.jenis,
        unit                : blokAktif.unit,
        bulan               : b + 1,
        bulan_nama          : CONFIG.BULAN_NAMA_MS[b],
        kod_bulan           : tahun + '-' + String(b + 1).padStart(2, '0'),
        pusat_operasi       : poCanonical,
        pusat_operasi_final : poCanonical,
        pusat_operasi_master: poCanonical,
        wilayah             : wilayah,
        nama_projek         : namaProjek,
        luas_kawasan_hek    : luasBerhasil, // luas berhasil digunakan sbg luas kawasan jika tiada berasingan
        luas_produktif_hek  : luasBerhasil,
        hasil               : val
      });
    }
  }
  return out;
}

// ===== UPSERT KE SUPABASE =====

function upsertBatch(rows) {
  var creds = getSupabaseCreds();
  var url = creds.url + '/rest/v1/' + CONFIG.REST_TABLE;
  var headers = {
    'apikey'        : creds.key,
    'Authorization' : 'Bearer ' + creds.key,
    'Content-Type'  : 'application/json',
    'Prefer'        : CONFIG.REST_UPSERT_PREFER
  };

  var totalUpserted = 0;
  var totalErrors   = 0;
  var batchSize     = CONFIG.REST_BATCH_SIZE;

  for (var i = 0; i < rows.length; i += batchSize) {
    var batch = rows.slice(i, i + batchSize);
    var options = {
      method            : 'post',
      headers           : headers,
      payload           : JSON.stringify(batch),
      muteHttpExceptions: true
    };
    try {
      var resp = UrlFetchApp.fetch(url, options);
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        totalUpserted += batch.length;
      } else {
        totalErrors += batch.length;
        Logger.log('Batch %s gagal: %s — %s',
          Math.floor(i / batchSize) + 1, code, resp.getContentText().substring(0, 500));
      }
    } catch (err) {
      totalErrors += batch.length;
      Logger.log('Batch %s exception: %s', Math.floor(i / batchSize) + 1, err.toString());
    }
  }

  return { upserted: totalUpserted, errors: totalErrors, total: rows.length };
}

// ===== UTIL =====

function tulisLogAudit(eventType, payload) {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('AUDIT_LOG_SHEET_ID');
  if (!ssId) {
    Logger.log('AUDIT_LOG_SHEET_ID tidak diset, skip log. Event=%s', eventType);
    Logger.log(JSON.stringify(payload));
    return;
  }
  try {
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('log') || ss.insertSheet('log');
    sheet.appendRow([
      new Date(),
      eventType,
      JSON.stringify(payload),
      Session.getActiveUser().getEmail()
    ]);
  } catch (err) {
    Logger.log('Gagal tulis audit log: %s', err.toString());
  }
}

function testSetup() {
  var creds = getSupabaseCreds();
  Logger.log('SUPABASE_URL: %s', creds.url);
  Logger.log('Root folder: %s', creds.rootFolderId);
  Logger.log('Tahun sync: %s', creds.tahunDefault);

  var folder = DriveApp.getFolderById(creds.rootFolderId);
  Logger.log('Folder HQ: %s', folder.getName());

  var subs = folder.getSubfolders();
  Logger.log('Subfolder HQ:');
  while (subs.hasNext()) {
    var sf = subs.next();
    Logger.log('  - %s', sf.getName());
  }
}