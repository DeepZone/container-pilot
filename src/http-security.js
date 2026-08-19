export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; }
  catch { return false; }
}

export function requireCsrf(req, session) {
  if (!sameOrigin(req) || !session || req.headers['x-csrf-token'] !== session.csrf) {
    throw Object.assign(new Error('Ungültiges CSRF-Token'), { status: 403 });
  }
}
