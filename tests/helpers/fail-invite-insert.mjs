// Solo se precarga en el subproceso del test. El resto del importador y de Supabase son reales.
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/rest/v1/mercado_invites' && (init?.method ?? input.method) === 'POST') {
    return Promise.resolve(new Response(JSON.stringify({ message: 'Simulated insert failure', code: 'test_failure' }), {
      status: 503, headers: { 'content-type': 'application/json' },
    }));
  }
  return original(input, init);
};
