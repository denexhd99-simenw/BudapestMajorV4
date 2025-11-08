
// eksempel: knappen "Vel lag"
import { addUser, removeUser, getUsersOnce, listenUsers } from "./sharedDataApi";

// kall når brukeren trykker "Vel lag"
document.querySelectorAll('.vel-lag-button').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    // hent data fra input-felter (tilpass ID/klassene)
    const nameInput = document.querySelector('#teamName');
    const teamName = nameInput ? nameInput.value.trim() : `Team-${Date.now()}`;
    const newUser = { name: teamName, score: 0, id: generateId() };
    try {
      await addUser(newUser);
      console.log('Bruker lagt til:', newUser);
      // optional: oppdater UI eller tøm input
      if (nameInput) nameInput.value = '';
    } catch (err) {
      console.error('Feil ved addUser', err);
      alert('Kunne ikke lagre brukeren: ' + err.message);
    }
  });
});

function generateId() {
  return 'u_' + Math.random().toString(36).slice(2,9);
}

// Admin: slette bruker ved knapp (antatt brukerobjekt har id eller name)
document.querySelectorAll('.admin-delete-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const userId = btn.dataset.userid; // eller data-name etc
    if (!confirm('Er du sikker på at du vil slette brukeren?')) return;
    try {
      const success = await removeUser(u => u.id === userId || u.name === userId);
      if (success) console.log('Bruker slettet');
      else console.warn('Fant ikke bruker å slette');
    } catch (err) {
      console.error('Delete feil', err);
    }
  });
});

// Deltakerliste: lytt live
const participantsContainer = document.querySelector('#participants');
listenUsers(users => {
  // rendrer users i participantsContainer
  if (!participantsContainer) return;
  participantsContainer.innerHTML = users.map(u => `<div class="p-item">${escapeHtml(u.name)} — ${u.score ?? 0}</div>`).join('') || '<i>Ingen deltagere</i>';
});
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
