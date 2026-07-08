import { test } from "node:test";
import assert from "node:assert/strict";
import { STUDENT_TOKEN, unmaskResult } from "../src/nexus7/pseudonym.js";

test("unmaskResult substitui o token em strings profundas e arrays", () => {
  const gerado = {
    titulo: `Aula para ${STUDENT_TOKEN}`,
    atividades: [`${STUDENT_TOKEN} desenha`, "sem token"],
    aninhado: { fala: `Diga a ${STUDENT_TOKEN}: ${STUDENT_TOKEN} consegue!` },
    numero: 7,
    nulo: null
  };
  const out = unmaskResult(gerado, "Maria Silva");
  assert.equal(out.titulo, "Aula para Maria Silva");
  assert.equal(out.atividades[0], "Maria Silva desenha");
  assert.equal(out.atividades[1], "sem token");
  assert.equal(out.aninhado.fala, "Diga a Maria Silva: Maria Silva consegue!");
  assert.equal(out.numero, 7);
  assert.equal(out.nulo, null);
});

test("unmaskResult sem nome retorna o objeto intacto", () => {
  const gerado = { titulo: `Oi ${STUDENT_TOKEN}` };
  assert.equal(unmaskResult(gerado, undefined), gerado);
  assert.equal(unmaskResult(null, "Maria"), null);
});
