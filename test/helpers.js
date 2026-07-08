// Utilitários compartilhados dos testes.
// Define env mínimo ANTES de qualquer import de módulos que exigem config.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || "test-key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-test";

// Response fake estilo Express para testar middlewares
export function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return res;
}

// Monta um JWT não-assinado apenas para testar decodificação de claims
export function fakeJwt(payload) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.assinatura-fake`;
}
