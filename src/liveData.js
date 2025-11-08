// src/liveData.js
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { removeUserById } from "./firebaseHelpers";

export function startLiveData(containerSelector = "#participants") {
  const sharedRef = doc(db, "sharedData", "main");

  const participantsContainer =
    document.querySelector(containerSelector) ||
    (() => {
      const el = document.createElement("div");
      el.id = containerSelector.replace("#", "");
      document.body.appendChild(el);
      return el;
    })();

  onSnapshot(sharedRef, (snap) => {
    if (!snap.exists()) {
      participantsContainer.innerHTML = "<p>Ingen data funnet.</p>";
      return;
    }
    const data = snap.data();
    const users = Array.isArray(data.users) ? data.users : [];

    participantsContainer.innerHTML = `
      <h2>Deltakere (${users.length})</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${users
          .map(
            (u) => `
          <li style="margin:8px 0; padding:6px; border-bottom:1px solid #eee;" data-id="${u.id}">
            <strong>${escapeHtml(u.name)}</strong>
            <span style="margin-left:10px;color:#444;">Lag: ${escapeHtml((u.stageTeams || []).join(", ") || "Ingen")}</span>
            <span style="margin-left:10px;color:#444;">Poeng: ${u.score ?? 0}</span>
            <button class="delete-user-btn" data-id="${u.id}" style="margin-left:12px;">Slett</button>
          </li>
        `
          )
          .join("")}
      </ul>
      <p style="font-size:12px;color:gray;">Sist oppdatert: ${new Date(data.lastUpdated || Date.now()).toLocaleString()}</p>
    `;

    // bind slett-knapper
    participantsContainer.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Slett bruker?")) return;
        try {
          await removeUserById(id);
        } catch (err) {
          console.error("Feil ved sletting:", err);
          alert("Feil ved sletting. Se konsoll.");
        }
      };
    });
  }, (err) => {
    console.error("onSnapshot error:", err);
    participantsContainer.textContent = "Feil ved innhenting av data.";
  });
}

function escapeHtml(s) {
  if (typeof s !== "string") return s;
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
