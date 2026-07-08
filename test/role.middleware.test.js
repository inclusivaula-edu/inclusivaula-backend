import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeRes } from "./helpers.js";
import { requireRole, roleMiddleware, roleLevel, ROLE_HIERARCHY } from "../src/middlewares/role.middleware.js";

test("hierarquia de roles está na ordem correta", () => {
  assert.deepEqual(ROLE_HIERARCHY, ["professor", "coordenador", "diretor", "secretaria", "mec"]);
});

test("roleLevel: role desconhecido cai no nível mais baixo (fail-closed)", () => {
  assert.equal(roleLevel("hacker"), 0);
  assert.equal(roleLevel(undefined), 0);
  assert.equal(roleLevel("mec"), 4);
});

test("requireRole permite role igual ou superior", () => {
  for (const [userRole, minRole, passes] of [
    ["diretor", "coordenador", true],
    ["coordenador", "coordenador", true],
    ["professor", "coordenador", false],
    ["mec", "diretor", true],
    ["secretaria", "mec", false],
    [undefined, "professor", true],          // nível 0 >= nível 0
    ["role_inexistente", "coordenador", false]
  ]) {
    const res = fakeRes();
    let passed = false;
    requireRole(minRole)({ role: userRole }, res, () => { passed = true; });
    assert.equal(passed, passes, `${userRole} vs mínimo ${minRole}`);
    if (!passes) assert.equal(res.statusCode, 403);
  }
});

test("roleMiddleware (legado) exige role exato da lista", () => {
  const res = fakeRes();
  let passed = false;
  roleMiddleware("diretor", "mec")({ role: "diretor" }, res, () => { passed = true; });
  assert.equal(passed, true);

  const res2 = fakeRes();
  let passed2 = false;
  roleMiddleware("diretor")({ role: "professor" }, res2, () => { passed2 = true; });
  assert.equal(passed2, false);
  assert.equal(res2.statusCode, 403);
});
