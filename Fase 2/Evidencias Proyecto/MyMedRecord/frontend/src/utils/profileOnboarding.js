// Solo una marca de interfaz por cuenta y sesión de navegador; nunca datos clínicos.
const key = 'mymedrecord_profile_prompt';
let shownFor = null;
export function claimProfilePrompt(userId) {
  if (!userId || shownFor === userId) return false;
  try { if (sessionStorage.getItem(key) === userId) return false; } catch { /* memoria como alternativa */ }
  shownFor = userId;
  try { sessionStorage.setItem(key, userId); } catch { /* memoria como alternativa */ }
  return true;
}
export function resetProfilePrompt() {
  shownFor = null;
  try { sessionStorage.removeItem(key); } catch { /* almacenamiento no disponible */ }
}
