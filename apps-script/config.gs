/**
 * config.gs — Konfigurasi statik untuk sync hasil ladang
 *
 * PENGGUNAAN: TIDAK BOLEH edit di sini untuk credential sensitif.
 *             Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dalam
 *             Project Settings → Script Properties (lihat README).
 *
 * Folder structure yang dijangka:
 *   <ROOT_HQ_FOLDER_ID>
 *     └ <WILAYAH_FOLDER>          (UTARA / TENGAH / TIMUR / SELATAN)
 *          └ <PO_FOLDER_OR_SHEET> (cth "TAPAH" / "MANJUNG")
 *               └ Sheet template TAPAH (nama sheet "TAPAH", "SAWIT", atau lain)
 */

var CONFIG = {

  // ID folder HQ (akar) — boleh override via Script Property SUPABASE_ROOT_FOLDER_ID
  ROOT_HQ_FOLDER_ID: '1BVi7AYsvbBGEoIA541Ev1YVhRa2MA8JX',

  // ID folder wilayah (override Script Properties jika perlu)
  WILAYAH_FOLDER_IDS: {
    'UTARA'   : '1fBkN-B1yh1u7XInTPvk6qSddKlDyTvR-',
    'TENGAH'  : '',
    'TIMUR'   : '',
    'SELATAN' : ''
  },

  // Peta PO kanonik → Wilayah
  // Diguna untuk rujuk silang dengan projek_ref.po dan hasil_bulanan_src.pusat_operasi_final
  PO_WILAYAH: {
    'UTARA'  : ['KUALA KANGSAR', 'MANJUNG', 'TAPAH', 'GERIK', 'KEDAH UTARA', 'KEDAH SELATAN'],
    'TIMUR'  : ['KUALA BERANG', 'MACHANG'],
    'TENGAH' : ['KUANTAN', 'LIPIS', 'RAUB', 'ROMPIN', 'TEMERLOH'],
    'SELATAN': ['JOHOR', 'MELAKA', 'N.SEMBILAN']
  },

  // Nama kanonik PO (normalize folder/spreadsheet name → nama untuk join)
  // key = nama mentah (uppercase, trimmed); value = nama kanonik
  PO_CANONICAL_MAP: {
    'KUALA KANGSAR' : 'KUALA KANGSAR',
    'MANJUNG'       : 'MANJUNG',
    'TAPAH'         : 'TAPAH',
    'GERIK'         : 'GERIK',
    'KEDAH UTARA'   : 'KEDAH',
    'KEDAH SELATAN' : 'KEDAH',
    'KUALA BERANG'  : 'KUALA BERANG',
    'MACHANG'       : 'MACHANG',
    'KUANTAN'       : 'KUANTAN',
    'LIPIS'         : 'LIPIS',
    'RAUB'          : 'RAUB',
    'ROMPIN'        : 'ROMPIN',
    'TEMERLOH'      : 'TEMERLOH',
    'JOHOR'         : 'JOHOR',
    'MELAKA'        : 'MELAKA',
    'N.SEMBILAN'    : 'N.SEMBILAN',
    'N SEMBILAN'    : 'N.SEMBILAN'
  },

  // Peta untuk detect block hasil dalam sheet
  // "HASIL SAWIT" di lajur A → mula blok sawit (unit MT)
  // "HASIL GETAH" di lajur A → mula blok getah (unit KG)
  BLOCK_MARKERS: {
    'HASIL SAWIT' : { jenis: 'SAWIT', unit: 'MT' },
    'HASIL GETAH' : { jenis: 'GETAH', unit: 'KG' }
  },

  // Lajur bulan dalam blok (JAN..DEC), kolum ke-?
  // Layout sheet TAPAH: BIL, NAMA PROJEK, LUAS BERHASIL, HASIL(sasaran tahunan),
  //                     JAN, FEB, MAC, APR, MEI, JUN, JUL, OGOS, SEP, OKT, NOV, DEC, JUMLAH
  // Indeks 0-based: 0=BIL, 1=NAMA, 2=LUAS, 3=SASARAN, 4..15=JAN..DEC, 16=JUMLAH
  BULAN_KOLUM_MULA: 4,
  BULAN_NAMA_MS: ['Januari','Februari','Mac','April','Mei','Jun',
                  'Julai','Ogos','September','Oktober','November','Disember'],
  BULAN_NAMA_EN: ['Jan','Feb','Mac','Apr','Mei','Jun',
                  'Jul','Ogos','Sep','Okt','Nov','Dis'],

  // REST endpoint Supabase (di-merge dengan SUPABASE_URL dari Script Properties)
  REST_TABLE: 'hasil_bulanan_src',
  REST_UPSERT_PREFER: 'resolution=merge-duplicates',
  REST_BATCH_SIZE: 500,

  // Tahun semasa — override setiap kali run untuk tahun baru
  TAHUN_DEFAULT: 2026
};

/**
 * Ambil konfigurasi sensitif dari Script Properties.
 * JANGAN hardcode SERVICE_ROLE_KEY dalam fail ini.
 */
function getSupabaseCreds() {
  var props = PropertiesService.getScriptProperties();
  var url  = props.getProperty('SUPABASE_URL');
  var key  = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  var root = props.getProperty('SUPABASE_ROOT_FOLDER_ID');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset dalam Script Properties.');
  }
  return {
    url           : url,
    key           : key,
    rootFolderId  : root || CONFIG.ROOT_HQ_FOLDER_ID,
    tahunDefault  : parseInt(props.getProperty('TAHUN_SYNC') || CONFIG.TAHUN_DEFAULT)
  };
}