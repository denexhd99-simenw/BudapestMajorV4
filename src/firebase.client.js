// src/firebase.client.js
export async function initFirebaseClient() {
  if (typeof window === 'undefined') return null;

  const { initializeApp } = await import('firebase/app');
  const { getFirestore, enableIndexedDbPersistence, doc, onSnapshot, setDoc, getDoc } = await import('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyCQB19AOFI87tqVIkm8Ir0yVGu9zj7WI-Q",
    authDomain: "majorbudapest.firebaseapp.com",
    projectId: "majorbudapest",
    storageBucket: "majorbudapest.appspot.com", // anbefalt å bruke .appspot.com — dobbeltsjekk i console
    messagingSenderId: "802254853097",
    appId: "1:802254853097:web:3699e11b76b0efcafaf178",
    measurementId: "G-GXRXZEN96S"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    await enableIndexedDbPersistence(db);
    console.log('Firebase: Offline persistence aktivert');
  } catch (e) {
    console.warn('Firebase: Persistence ikke aktivert:', e && e.message);
  }

  // Start onSnapshot og funksjoner som du tidligere hadde i firebase.js
  const sharedRef = doc(db, "sharedData", "main");

  const stop = onSnapshot(sharedRef, (snap) => {
    if (!snap.exists()) {
      setDoc(sharedRef, { users: [], lastUpdated: Date.now() }, { merge: true })
        .then(() => console.log("Firebase: Opprettet default sharedData/main"))
        .catch(e => console.error("Firebase: Feil ved oppretting av default:", e));
      return;
    }
    const data = snap.data();
    console.log("Firebase: onSnapshot mottok data:", data);
    window.latestSharedData = data;
    try {
      window.dispatchEvent(new CustomEvent("sharedDataChanged", { detail: data }));
    } catch (e) {
      console.warn("Kunne ikke dispatch event:", e);
    }
  }, (err) => {
    console.error("Firebase: onSnapshot error:", err);
  });

  // expose save/fetch helpers
  window.saveShared = async function (usersArray) {
    if (!Array.isArray(usersArray)) {
      console.warn("saveShared forventer et array. Ignorerer.");
      return;
    }
    try {
      await setDoc(sharedRef, { users: usersArray, lastUpdated: Date.now() }, { merge: true });
      console.log("Firebase: Lagra til sharedData/main");
    } catch (err) {
      console.error("Firebase: Feil ved lagring:", err);
    }
  };

  window.fetchSharedOnce = async function () {
    try {
      const snap = await getDoc(sharedRef);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.error("Firebase: fetchSharedOnce feil:", e);
      return null;
    }
  };

  return { app, db, stop };
}
