export function getOrCreateSessionId() {
  const name = "ax_sess";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (m) return decodeURIComponent(m[1]);
  const sid = crypto.getRandomValues(new Uint32Array(4)).reduce((s,n)=>s+n.toString(36),"");
  document.cookie = `${name}=${encodeURIComponent(sid)}; Path=/; SameSite=Lax`;
  return sid;
}
