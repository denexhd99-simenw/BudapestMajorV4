// src/sharedDataApi.js
// API for å håndtere sharedData/main.users på Firestore (modular SDK)

import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "./firebase"; // forutsetter at src/firebase.js eksporterer `db`

const sharedRef = doc(db, "sharedData", "main");

export async function addUser(newUser) {
  if (!newUser || typeof newUser !== "object") throw new Error("addUser forventer et objekt");
  // legg til tid hvis ikke satt
  if (!newUser.createdAt) newUser.createdAt = Date.now();
  try {
    await updateDoc(sharedRef, {
      users: arrayUnion(newUser),
      lastUpdated: Date.now()
    });
    return true;
  } catch (e) {
    // hvis dokumentet ikke finnes ennå, opprett det med setDoc
    if (e.code === "not-found" || e.message?.includes("No document to update")) {
      await setDoc(sharedRef, { users: [newUser], lastUpdated: Date.now() }, { merge: true });
      return true;
    }
    throw e;
  }
}

export async function removeUser(matchFn) {
  // matchFn kan være et objekt for matching after shallow compare eller en funksjon som returnerer true for brukere som skal fjernes
  const snap = await getDoc(sharedRef);
  if (!snap.exists()) return false;
  const data = snap.data();
  const users = Array.isArray(data.users) ? data.users : [];

  let removed = false;
  let newUsers = users.filter(u => {
    const shouldRemove = (typeof matchFn === "function") ? matchFn(u) : shallowMatch(u, matchFn);
    if (shouldRemove) removed = true;
    return !shouldRemove;
  });

  if (!removed) return false;

  // skriv tilbake nye users
  await updateDoc(sharedRef, { users: newUsers, lastUpdated: Date.now() });
  return true;
}

function shallowMatch(obj, pattern) {
  if (!pattern) return false;
  for (const k of Object.keys(pattern)) {
    if (obj[k] !== pattern[k]) return false;
  }
  return true;
}

export async function getUsersOnce() {
  const snap = await getDoc(sharedRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data.users) ? data.users : [];
}

export function listenUsers(onChange, onError) {
  // onChange får hele users-arrayen
  return onSnapshot(sharedRef, (snap) => {
    if (!snap.exists()) return onChange([]);
    const data = snap.data();
    onChange(Array.isArray(data.users) ? data.users : []);
  }, onError);
}
