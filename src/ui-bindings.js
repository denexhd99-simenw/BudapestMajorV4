// src/ui-bindings.js
import { addUserSafe } from "./firebaseHelpers";

export function bindUI(selectors = {}) {
  const nameInput = document.getElementById(selectors.nameInputId || "name-input");
  const addBtn = document.getElementById(selectors.addBtnId || "vel-lag-button");
  const stage1 = document.getElementById(selectors.stage1Id || "stage1-select"); // optional selects
  const stage2 = document.getElementById(selectors.stage2Id || "stage2-select");
  const stage3 = document.getElementById(selectors.stage3Id || "stage3-select");

  if (!addBtn || !nameInput) {
    console.warn("UI bindings: fant ikke knapp eller navn-input. Sjekk ID-er.");
    return;
  }

  addBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = (nameInput.value || "").trim();
    if (!name) return alert("Skriv inn navn");

    const teams = [];
    if (stage1 && stage1.value) teams.push(stage1.value);
    if (stage2 && stage2.value) teams.push(stage2.value);
    if (stage3 && stage3.value) teams.push(stage3.value);

    const newUser = {
      id: Date.now().toString(),
      name,
      stageTeams: teams,
      score: 0,
      createdAt: Date.now()
    };

    try {
      await addUserSafe(newUser);
      nameInput.value = "";
      console.log("Bruker lagt til via UI:", newUser);
    } catch (err) {
      console.error("Feil ved addUserSafe:", err);
      alert("Feil ved lagring. Sjekk konsoll.");
    }
  });
}
