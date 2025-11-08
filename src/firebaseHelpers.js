// src/firebaseHelpers.js
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const SHARED_REF = doc(db, "sharedData", "main");

export async function getSharedData() {
  const snap = await getDoc(SHARED_REF);
  return snap.exists() ? snap.data() : { users: [], lastUpdated: 0 };
}

export async function addUserSafe(newUser) {
  if (!newUser.id) newUser.id = Date.now().toString();
  const snap = await getDoc(SHARED_REF);
  const current = snap.exists() ? (snap.data().users || []) : [];
  // unngå duplikat-id
  if (current.find(u => u.id === newUser.id)) return current;
  const updated = [...current, newUser];
  await updateDoc(SHARED_REF, { users: updated, lastUpdated: Date.now() });
  return updated;
}

export async function removeUserById(id) {
  const snap = await getDoc(SHARED_REF);
  const current = snap.exists() ? (snap.data().users || []) : [];
  const filtered = current.filter(u => u.id !== id);
  await updateDoc(SHARED_REF, { users: filtered, lastUpdated: Date.now() });
  return filtered;
}
