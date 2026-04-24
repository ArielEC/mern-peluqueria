/**
 * Test JWT invalidation after password change.
 * Runs standalone — no DB mock needed, hits the real running server.
 */
import assert from 'node:assert/strict';

const BASE = 'http://localhost:5000/api';
const TS = Date.now();
const EMAIL = `jwt_test_${TS}@test.com`;

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return res.json();
}

const main = async () => {
  // 1. Register
  const reg = await req('POST', '/auth/register', {
    nombre: 'JWT Test User', email: EMAIL, password: 'oldpass1'
  });
  assert.ok(reg.token, `Registro falló: ${JSON.stringify(reg)}`);
  const oldToken = reg.token;
  console.log('  ✓ Registro OK — token obtenido');

  // 2. Verify old token works
  const me1 = await req('GET', '/auth/me', null, oldToken);
  assert.equal(me1.user?.nombre, 'JWT Test User', 'Token no funciona antes del cambio');
  console.log('  ✓ GET /me con token antiguo → OK');

  // 3. Wait 1s then change password (ensures passwordChangedAt > token iat)
  await new Promise(r => setTimeout(r, 1100));
  const change = await req('PUT', '/auth/change-password', {
    currentPassword: 'oldpass1', newPassword: 'newpass99'
  }, oldToken);
  assert.equal(change.message, 'Contraseña actualizada correctamente', `Cambio falló: ${JSON.stringify(change)}`);
  console.log('  ✓ Contraseña cambiada OK');

  // 4. Wait 1s to ensure DB writes are settled
  await new Promise(r => setTimeout(r, 1000));

  // 5. Old token must be rejected now
  const me2 = await req('GET', '/auth/me', null, oldToken);
  assert.ok(!me2.user, `Token antiguo sigue válido (BUG): ${JSON.stringify(me2)}`);
  assert.ok(me2.error?.toLowerCase().includes('sesión') || me2.error?.toLowerCase().includes('contraseña') || me2.error,
    `Error inesperado: ${JSON.stringify(me2)}`);
  console.log(`  ✓ Token antiguo rechazado: "${me2.error}"`);

  // 6. New login works fine
  const login = await req('POST', '/auth/login', { email: EMAIL, password: 'newpass99' });
  assert.ok(login.token, `Login con nueva contraseña falló: ${JSON.stringify(login)}`);
  const me3 = await req('GET', '/auth/me', null, login.token);
  assert.equal(me3.user?.nombre, 'JWT Test User', 'Nuevo token no funciona');
  console.log('  ✓ Nuevo login y token funcionan correctamente');
};

console.log('TEST 40 — Invalidación de JWT tras cambio de contraseña:');
main()
  .then(() => console.log('TEST 40 OK: JWT invalidation funciona correctamente.'))
  .catch(e => { console.error('TEST 40 FAIL:', e.message); process.exit(1); });
