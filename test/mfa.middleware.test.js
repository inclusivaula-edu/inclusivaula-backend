import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeRes, fakeJwt } from "./helpers.js";
const { requireMFA } = await import("../src/middlewares/mfa.middleware.js");

test("requireMFA bloqueia sessão AAL1 (sem segundo fator)", () => {
  const req = { headers: { authorization: `Bearer ${fakeJwt({ aal: "aal1", sub: "u1" })}` } };
  const res = fakeRes();
  let passed = false;
  requireMFA(req, res, () => { passed = true; });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "MFA_REQUIRED");
});

test("requireMFA permite sessão AAL2 (com TOTP)", () => {
  const req = { headers: { authorization: `Bearer ${fakeJwt({ aal: "aal2", sub: "u1" })}` } };
  const res = fakeRes();
  let passed = false;
  requireMFA(req, res, () => { passed = true; });
  assert.equal(passed, true);
});

test("requireMFA trata token ausente ou ilegível como AAL1", () => {
  const semToken = fakeRes();
  requireMFA({ headers: {} }, semToken, () => assert.fail("não deveria passar"));
  assert.equal(semToken.statusCode, 401);

  const lixo = fakeRes();
  requireMFA({ headers: { authorization: "Bearer nao-e-jwt" } }, lixo, () => assert.fail("não deveria passar"));
  assert.equal(lixo.statusCode, 403);
});
