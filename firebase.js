/* ==================== FIREBASE INIT ==================== */

let db = null;
let auth = null;
let firebaseReady = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.error("❌ Firebase SDK belum ke-load");
    return false;
  }
  try {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    firebaseReady = true;
    console.log("✅ Firebase siap");
    return true;
  } catch (e) {
    console.error("❌ Firebase error:", e);
    return false;
  }
}

/* ==================== FIRESTORE CRUD ==================== */
async function fbGetAll(collectionName) {
  if (!firebaseReady) return [];
  try {
    const snapshot = await db.collection(collectionName).get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
  } catch (e) {
    console.error(`Gagal ambil ${collectionName}:`, e);
    return [];
  }
}

async function fbGetOne(collectionName, docId) {
  if (!firebaseReady) return null;
  try {
    const doc = await db.collection(collectionName).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.error(`Gagal ambil ${collectionName}/${docId}:`, e);
    return null;
  }
}

async function fbAdd(collectionName, data) {
  if (!firebaseReady) return null;
  try {
    const ref = await db.collection(collectionName).add(data);
    return ref.id;
  } catch (e) {
    console.error(`Gagal tambah ke ${collectionName}:`, e);
    return null;
  }
}

async function fbSet(collectionName, docId, data) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).set(data);
    return true;
  } catch (e) {
    console.error(`Gagal set ${collectionName}/${docId}:`, e);
    return false;
  }
}

async function fbUpdate(collectionName, docId, data) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).update(data);
    return true;
  } catch (e) {
    console.error(`Gagal update ${collectionName}/${docId}:`, e);
    return false;
  }
}

async function fbDelete(collectionName, docId) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  } catch (e) {
    console.error(`Gagal hapus ${collectionName}/${docId}:`, e);
    return false;
  }
}

/* ==================== SUBCOLLECTION ==================== */
async function fbGetSubcollection(parentCol, parentDoc, subCol) {
  if (!firebaseReady) return [];
  try {
    const snapshot = await db.collection(parentCol).doc(parentDoc).collection(subCol).get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => Number(a.id) - Number(b.id));
    return data;
  } catch (e) {
    console.error(`Gagal ambil ${parentCol}/${parentDoc}/${subCol}:`, e);
    return [];
  }
}

/* ==================== SEED ==================== */
async function fbSeed(collectionName, dataArray, keyField = "id") {
  if (!firebaseReady) return false;
  try {
    const batch = db.batch();
    dataArray.forEach(item => {
      const key = String(item[keyField] || item.id || item.slug);
      const ref = db.collection(collectionName).doc(key);
      batch.set(ref, item);
    });
    await batch.commit();
    console.log(`✅ Seed ${collectionName}: ${dataArray.length} item`);
    return true;
  } catch (e) {
    console.error(`Gagal seed ${collectionName}:`, e);
    return false;
  }
}

/* ==================== INIT ==================== */
initFirebase();
