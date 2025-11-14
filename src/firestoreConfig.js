
// src/firestoreConfig.js
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc
} from "firebase/firestore";
import { db } from "./firebase";

// Refs
const RULES_REF = doc(db, "config", "rules");
const TEAMSTATE_REF = doc(db, "config", "teamState");
const SHARED_REF = doc(db, "sharedData", "main");
const MATCHES_COL = collection(db, "matches");

// ===== Rules =====
export async function getRulesOnce() {
  const snap = await getDoc(RULES_REF);
  return snap.exists() ? snap.data() : null;
}
export async function writeRules(rulesObj) {
  const snap = await getDoc(RULES_REF);
  if (!snap.exists()) await setDoc(RULES_REF, rulesObj);
  else await updateDoc(RULES_REF, rulesObj);
}
export function subscribeRules(cb, onError) {
  return onSnapshot(RULES_REF, (snap) => cb(snap.exists() ? snap.data() : null), onError);
}

// ===== TeamState =====
export async function getTeamStateOnce() {
  const snap = await getDoc(TEAMSTATE_REF);
  return snap.exists() ? snap.data() : null;
}
export async function writeTeamState(stateObj) {
  const snap = await getDoc(TEAMSTATE_REF);
  if (!snap.exists()) await setDoc(TEAMSTATE_REF, stateObj);
  else await updateDoc(TEAMSTATE_REF, stateObj);
}
export function subscribeTeamState(cb, onError) {
  return onSnapshot(TEAMSTATE_REF, (snap) => cb(snap.exists() ? snap.data() : null), onError);
}

// ===== Shared / Users (sharedData/main) =====
export async function getSharedOnce() {
  const snap = await getDoc(SHARED_REF);
  return snap.exists() ? snap.data() : null;
}
export async function writeShared(obj) {
  const snap = await getDoc(SHARED_REF);
  if (!snap.exists()) await setDoc(SHARED_REF, obj);
  else await updateDoc(SHARED_REF, obj);
}
export function subscribeShared(cb, onError) {
  return onSnapshot(SHARED_REF, (snap) => cb(snap.exists() ? snap.data() : null), onError);
}

// ===== Matches =====
/**
 * addMatchResult(match)
 * match: { teamA, teamB, winner, scoreA, scoreB, stage }
 */
export async function addMatchResult(match) {
  const docRef = await addDoc(MATCHES_COL, { ...match, createdAt: Date.now() });
  return docRef.id;
}
export function subscribeMatches(cb, onError) {
  return onSnapshot(MATCHES_COL, (snap) => {
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(arr);
  }, onError);
}

// Exports
export { SHARED_REF, MATCHES_COL };
export const SHARED_REF = { /* placeholder for your Firestore ref */ };