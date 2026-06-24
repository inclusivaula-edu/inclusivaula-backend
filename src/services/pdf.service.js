import PDFDocument from "pdfkit";

// Cores da identidade visual InclusivAula
const CORES = {
  azul: "#2B9EC3",
  verde: "#4CAF82",
  roxo: "#534AB7",
  amarelo: "#BA7517",
  vermelho: "#a32d2d",
  cinza: "#5f5e5a",
  cinzaClaro: "#f1efe8",
  bordaClara: "#d3d1c7"
};

// Tenta baixar imagem como buffer — retorna null se falhar
async function fetchImageBuffer(url) {
  try {
    const res = await globalThis.fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// Cria um PDFDocument com footer automático em todas as páginas (via pageAdded event)
function criarDoc(res, filename) {
  const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: false });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.on("pageAdded", () => {
    // Desenha rodapé imediatamente ao criar a página
    const yRodape = doc.page.height - 40;
    doc.moveTo(50, yRodape - 10).lineTo(doc.page.width - 50, yRodape - 10)
      .strokeColor(CORES.bordaClara).lineWidth(0.5).stroke();
    doc.fontSize(8).fillColor(CORES.cinza).font("Helvetica")
      .text(
        `Gerado por InclusivAula — www.inclusivaula.com.br — ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
        50, yRodape, { align: "center", width: doc.page.width - 100 }
      );
    // Reseta cursor para o topo da página após desenhar rodapé
    doc.y = doc.page.margins.top || 50;
  });

  doc.addPage(); // Primeira página — dispara pageAdded
  return doc;
}

// Desenha o cabeçalho padrão
function desenharCabecalho(doc, titulo, subtitulo) {
  doc.rect(0, 0, doc.page.width, 8).fill(CORES.azul);

  doc.fontSize(20).fillColor(CORES.azul).font("Helvetica-Bold").text("Inclusiv", 50, 25, { continued: true });
  doc.fillColor(CORES.verde).text("Aula");

  doc.fontSize(8).fillColor(CORES.cinza).font("Helvetica")
    .text("Educação adaptada. Inclusão de verdade.", 50, 50);

  doc.moveTo(50, 65).lineTo(doc.page.width - 50, 65).strokeColor(CORES.bordaClara).lineWidth(0.5).stroke();

  doc.fontSize(15).fillColor(CORES.azul).font("Helvetica-Bold")
    .text(titulo, 50, 80, { width: doc.page.width - 100 });

  let y = doc.y + 6;

  if (subtitulo) {
    doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
      .text(subtitulo, 50, y, { width: doc.page.width - 100 });
    y = doc.y + 6;
  }

  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(CORES.azul).lineWidth(1).stroke();

  return y + 16;
}

// Desenha o bloco de dados da escola (antes dos dados do aluno)
async function desenharEscola(doc, escola, y) {
  if (!escola) return y;

  const linhas = [];
  const cidadeEstado = [escola.city, escola.state].filter(Boolean).join(" — ");
  if (cidadeEstado) linhas.push(cidadeEstado);
  if (escola.address) linhas.push(escola.address);
  const partesTel = [
    escola.phone ? `Tel: ${escola.phone}` : "",
    escola.inep_code ? `INEP: ${escola.inep_code}` : "",
    escola.cnpj ? `CNPJ: ${escola.cnpj}` : ""
  ].filter(Boolean);
  if (partesTel.length) linhas.push(partesTel.join("   |   "));

  const h = Math.max(64, 28 + linhas.length * 13 + 10);
  doc.rect(50, y, doc.page.width - 100, h).fill("#f0f8ff").stroke(CORES.bordaClara);

  let logoDrawn = false;
  if (escola.logo_url) {
    const imgBuf = await fetchImageBuffer(escola.logo_url);
    if (imgBuf) {
      try {
        const logoH = Math.min(h - 12, 48);
        doc.image(imgBuf, 58, y + 6, { height: logoH, fit: [logoH, logoH] });
        logoDrawn = true;
      } catch { /* ignora falha no logo */ }
    }
  }

  const textX = logoDrawn ? 116 : 62;
  const textW = doc.page.width - textX - 54;

  doc.fontSize(12).fillColor(CORES.azul).font("Helvetica-Bold")
    .text(escola.name || "—", textX, y + 8, { width: textW });

  let ly = y + 24;
  doc.fontSize(8.5).fillColor(CORES.cinza).font("Helvetica");
  for (const linha of linhas) {
    doc.text(linha, textX, ly, { width: textW });
    ly += 13;
  }

  return y + h + 8;
}

// Desenha uma seção com título colorido e conteúdo
function desenharSecao(doc, titulo, conteudo, cor, y) {
  // Mede altura com font correto (10pt) antes de decidir quebra de página
  doc.fontSize(10);
  const alturaConteudo = doc.heightOfString(conteudo, { width: doc.page.width - 100 });
  const alturaMinima = alturaConteudo + 60; // 14 barra + ~18 título + 16 margem + 12 padding

  if (y + alturaMinima > doc.page.height - 60) {
    doc.addPage(); // pageAdded cuida do rodapé
    y = 60;
  }

  doc.rect(50, y, 3, 14).fill(cor || CORES.azul);
  doc.fontSize(11).fillColor(cor || CORES.azul).font("Helvetica-Bold")
    .text(titulo, 60, y + 1, { width: doc.page.width - 110 });
  y += 20;

  doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica")
    .text(conteudo, 50, y, { width: doc.page.width - 100, align: "justify" });
  y = doc.y + 16;

  return y;
}

// Desenha uma lista de itens com bullet
function desenharLista(doc, titulo, itens, cor, y) {
  if (!itens || itens.length === 0) return y;

  if (y > doc.page.height - 120) {
    doc.addPage(); // pageAdded cuida do rodapé
    y = 60;
  }

  doc.rect(50, y, 3, 14).fill(cor || CORES.verde);
  doc.fontSize(11).fillColor(cor || CORES.verde).font("Helvetica-Bold")
    .text(titulo, 60, y + 1);
  y += 20;

  itens.forEach(item => {
    if (y > doc.page.height - 80) {
      doc.addPage(); // pageAdded cuida do rodapé
      y = 60;
    }
    const texto = typeof item === "string" ? item : JSON.stringify(item);
    doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica")
      .text(`• ${texto}`, 55, y, { width: doc.page.width - 105 });
    y = doc.y + 6;
  });

  return y + 8;
}

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE RELATÓRIO PEDAGÓGICO
// ─────────────────────────────────────────────────────────────────
export const generateStudentReportPDF = async (reportData, res) => {
  const nomeArquivo = `relatorio-${(reportData.student?.full_name || "aluno").replace(/ /g, "-")}.pdf`;
  const doc = criarDoc(res, nomeArquivo);

  const rep = reportData.report || reportData;
  const aluno = reportData.student;
  const metrics = reportData.metrics;
  const escola = reportData.escola;

  const nomeAluno = aluno?.full_name || rep.aluno?.nome || "";
  let y = desenharCabecalho(doc, rep.titulo || "Relatório Pedagógico",
    nomeAluno ? `Aluno: ${nomeAluno}  |  Período: ${rep.periodo || "—"}` : (rep.periodo || ""));

  y = await desenharEscola(doc, escola, y);

  // Bloco dados do aluno
  doc.rect(50, y, doc.page.width - 100, 60).fill("#f5f9ff").stroke(CORES.bordaClara);
  doc.fontSize(11).fillColor(CORES.azul).font("Helvetica-Bold").text("Dados do Aluno", 60, y + 8);
  doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
    .text(`Nome: ${aluno?.full_name || rep.aluno?.nome || "—"}`, 60, y + 22);
  doc.text(`Série: ${aluno?.grade || rep.aluno?.serie || "—"}   |   Turma: ${aluno?.turma || rep.aluno?.turma || "—"}   |   NEE: ${aluno?.disability_type || rep.aluno?.nee || "—"}`, 60, y + 36);
  y += 74;

  // Métricas
  if (metrics) {
    const cols = [
      { label: "Aulas geradas", valor: metrics.totalAulas ?? "—" },
      { label: "Avaliações",    valor: metrics.totalAvaliacoes ?? "—" },
      { label: "Média geral",   valor: metrics.mediaNota ? `${metrics.mediaNota}/10` : "—" },
      { label: "Frequência",    valor: metrics.frequencia ? `${metrics.frequencia}%` : "—" }
    ];
    const cw = (doc.page.width - 100) / 4;
    cols.forEach((col, i) => {
      const x = 50 + i * cw;
      doc.rect(x, y, cw - 4, 44).fill("#fff").stroke(CORES.bordaClara);
      doc.fontSize(16).fillColor(CORES.azul).font("Helvetica-Bold").text(String(col.valor), x + 4, y + 6, { width: cw - 12, align: "center" });
      doc.fontSize(8).fillColor(CORES.cinza).font("Helvetica").text(col.label, x + 4, y + 28, { width: cw - 12, align: "center" });
    });
    y += 58;
  }

  if (rep.sumario_executivo)        y = desenharSecao(doc, "Sumário Executivo", rep.sumario_executivo, CORES.azul, y);
  if (rep.desenvolvimento_academico) y = desenharSecao(doc, "Desenvolvimento Acadêmico", rep.desenvolvimento_academico, CORES.azul, y);
  if (rep.desenvolvimento_social)    y = desenharSecao(doc, "Desenvolvimento Social", rep.desenvolvimento_social, CORES.verde, y);
  if (rep.adaptacoes_aplicadas)      y = desenharSecao(doc, "Adaptações Aplicadas", rep.adaptacoes_aplicadas, CORES.roxo, y);
  if (rep.pontos_positivos?.length)  y = desenharLista(doc, "Pontos Positivos", rep.pontos_positivos, CORES.verde, y);
  if (rep.areas_de_atencao?.length)  y = desenharLista(doc, "Áreas de Atenção", rep.areas_de_atencao, CORES.amarelo, y);
  if (rep.recomendacoes?.length)     y = desenharLista(doc, "Recomendações Pedagógicas", rep.recomendacoes, CORES.azul, y);
  if (rep.metas_proxima_periodo?.length) y = desenharLista(doc, "Metas para o Próximo Período", rep.metas_proxima_periodo, CORES.roxo, y);
  if (rep.observacoes_finais)        y = desenharSecao(doc, "Observações Finais", rep.observacoes_finais, CORES.cinza, y);
  if (rep.base_legal)                desenharSecao(doc, "Base Legal e Científica", rep.base_legal, CORES.cinza, y);

  doc.end();
};

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE AULA
// ─────────────────────────────────────────────────────────────────
export const generateLessonPDF = async (lessonData, res) => {
  const lesson = lessonData.result || lessonData;
  const input = lessonData.input || {};

  const nomeArquivo = `aula-${(lesson.titulo || "aula").replace(/ /g, "-")}.pdf`;
  const doc = criarDoc(res, nomeArquivo);

  const subtitulo = [input.serie, input.disciplina, input.periodo, input.deficiencia].filter(Boolean).join(" · ");
  let y = desenharCabecalho(doc, lesson.titulo || "Plano de Aula", subtitulo);

  if (lesson.estrategia) {
    const h = doc.heightOfString(lesson.estrategia, { width: doc.page.width - 120 }) + 20;
    doc.rect(50, y, doc.page.width - 100, h).fill("#e8f7fd");
    doc.fontSize(10).fillColor(CORES.azul).font("Helvetica-Oblique")
      .text(lesson.estrategia, 60, y + 10, { width: doc.page.width - 120 });
    y += h + 12;
  }

  if (lesson.bncc?.length) {
    if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    doc.rect(50, y, 3, 14).fill(CORES.roxo);
    doc.fontSize(11).fillColor(CORES.roxo).font("Helvetica-Bold").text("Habilidades BNCC", 60, y + 1);
    y += 20;
    lesson.bncc.forEach(b => {
      if (y > doc.page.height - 80) { doc.addPage(); y = 60; }
      const hb = doc.heightOfString(b.descricao, { width: doc.page.width - 130 }) + 16;
      doc.rect(50, y, doc.page.width - 100, hb).fill("#EEEDFE");
      doc.fontSize(9).fillColor(CORES.roxo).font("Helvetica-Bold").text(`[${b.codigo}]`, 58, y + 6);
      doc.fontSize(9).fillColor("#2c2c2a").font("Helvetica").text(b.descricao, 100, y + 6, { width: doc.page.width - 150 });
      y += hb + 4;
    });
    y += 8;
  }

  if (lesson.explicacao) y = desenharSecao(doc, "Explicação do Conteúdo", lesson.explicacao, CORES.azul, y);

  if (lesson.atividades?.length) {
    if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    doc.rect(50, y, 3, 14).fill(CORES.verde);
    doc.fontSize(11).fillColor(CORES.verde).font("Helvetica-Bold").text("Atividades", 60, y + 1);
    y += 20;
    lesson.atividades.forEach((a, i) => {
      if (y > doc.page.height - 80) { doc.addPage(); y = 60; }
      const texto = typeof a === "string" ? a.replace(/^atividade\s*\d+[:\-]?\s*/i, "") : a.descricao || JSON.stringify(a);
      doc.fontSize(10).fillColor(CORES.verde).font("Helvetica-Bold").text(`Atividade ${i + 1}`, 50, y);
      y += 14;
      doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica").text(texto, 55, y, { width: doc.page.width - 105 });
      y = doc.y + 10;
    });
    y += 4;
  }

  if (lesson.adaptacoes?.length) y = desenharLista(doc, "Adaptações Inclusivas", lesson.adaptacoes.map(a => typeof a === "string" ? a : JSON.stringify(a)), CORES.azul, y);
  if (lesson.recursos?.length)   y = desenharLista(doc, "Recursos Didáticos", lesson.recursos.map(r => typeof r === "string" ? r : JSON.stringify(r)), CORES.verde, y);
  if (lesson.avaliacao)          y = desenharSecao(doc, "Avaliação", lesson.avaliacao, CORES.azul, y);
  if (lesson.base_legal)         desenharSecao(doc, "Base Legal e Científica", lesson.base_legal, CORES.cinza, y);

  doc.end();
};

// ─────────────────────────────────────────────────────────────────
// NÚCLEO COMPARTILHADO: AEE / PAEE
// ─────────────────────────────────────────────────────────────────
async function gerarPDFPlanoAEE(doc, aee, student, escola, periodo, titulo) {
  const nomeAluno = aee.identificacao?.nome_aluno || student?.full_name || "—";
  let y = desenharCabecalho(doc, titulo, `Aluno: ${nomeAluno}  |  Período: ${periodo || "—"}`);

  y = await desenharEscola(doc, escola, y);

  // Bloco identificação
  doc.rect(50, y, doc.page.width - 100, 60).fill("#f5f9ff").stroke(CORES.bordaClara);
  doc.fontSize(11).fillColor(CORES.azul).font("Helvetica-Bold").text("Identificação", 60, y + 8);
  doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
    .text(`Aluno: ${nomeAluno}`, 60, y + 22);
  doc.text(`Série: ${aee.identificacao?.serie || student?.grade || "—"}   |   NEE: ${aee.identificacao?.deficiencia_nee || student?.disability_type || "—"}`, 60, y + 36);
  y += 74;

  if (aee.avaliacao_inicial?.necessidades_especificas)
    y = desenharSecao(doc, "Necessidades Específicas", aee.avaliacao_inicial.necessidades_especificas, CORES.azul, y);

  if (aee.avaliacao_inicial?.habilidades_preservadas?.length)
    y = desenharLista(doc, "Habilidades Preservadas", aee.avaliacao_inicial.habilidades_preservadas, CORES.verde, y);

  if (aee.avaliacao_inicial?.barreiras_aprendizagem?.length)
    y = desenharLista(doc, "Barreiras de Aprendizagem", aee.avaliacao_inicial.barreiras_aprendizagem, CORES.amarelo, y);

  if (aee.plano_atendimento) {
    const pa = aee.plano_atendimento;
    const resumo = [
      pa.frequencia ? `Frequência: ${pa.frequencia}` : "",
      pa.duracao    ? `Duração: ${pa.duracao}`        : "",
      pa.local      ? `Local: ${pa.local}`            : "",
      pa.agrupamento ? `Agrupamento: ${pa.agrupamento}` : ""
    ].filter(Boolean).join("  |  ");
    if (resumo) y = desenharSecao(doc, "Plano de Atendimento", resumo, CORES.roxo, y);
    if (pa.objetivos?.length)  y = desenharLista(doc, "Objetivos", pa.objetivos, CORES.roxo, y);
    if (pa.atividades?.length) {
      const itensAtividades = pa.atividades.map(a =>
        typeof a === "string" ? a : `${a.atividade}: ${a.descricao}`
      );
      y = desenharLista(doc, "Atividades", itensAtividades, CORES.verde, y);
    }
  }

  if (aee.tecnologia_assistiva?.length) {
    const itens = aee.tecnologia_assistiva.map(ta =>
      typeof ta === "string" ? ta : `${ta.recurso}: ${ta.uso_no_aee || ta.finalidade || ""}`
    );
    y = desenharLista(doc, "Tecnologia Assistiva", itens, CORES.azul, y);
  }

  if (aee.articulacao_sala_regular?.orientacoes_professor?.length)
    y = desenharLista(doc, "Orientações ao Professor Regular", aee.articulacao_sala_regular.orientacoes_professor, CORES.verde, y);

  if (aee.articulacao_familia?.orientacoes?.length)
    y = desenharLista(doc, "Orientações à Família", aee.articulacao_familia.orientacoes, CORES.azul, y);

  if (aee.avaliacao_resultados?.instrumentos?.length)
    y = desenharLista(doc, "Instrumentos de Avaliação", aee.avaliacao_resultados.instrumentos, CORES.cinza, y);

  if (aee.base_legal)
    desenharSecao(doc, "Base Legal", aee.base_legal, CORES.cinza, y);
}

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE PLANO AEE
// ─────────────────────────────────────────────────────────────────
export const generateAEEPDF = async (docData, res) => {
  const student = docData.student || {};
  const nomeArquivo = `plano-aee-${(student.full_name || "aluno").replace(/ /g, "-")}.pdf`;
  const doc = criarDoc(res, nomeArquivo);
  await gerarPDFPlanoAEE(doc, docData.result || {}, student, docData.escola, docData.periodo,
    "Plano AEE — Atendimento Educacional Especializado");
  doc.end();
};

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE PAEE (Plano de Atendimento Educacional Especializado)
// ─────────────────────────────────────────────────────────────────
export const generatePAEEPDF = async (docData, res) => {
  const student = docData.student || {};
  const nomeArquivo = `paee-${(student.full_name || "aluno").replace(/ /g, "-")}.pdf`;
  const doc = criarDoc(res, nomeArquivo);
  await gerarPDFPlanoAEE(doc, docData.result || {}, student, docData.escola, docData.periodo,
    "PAEE — Plano de Atendimento Educacional Especializado");
  doc.end();
};

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE PEI
// ─────────────────────────────────────────────────────────────────
export const generatePEIPDF = async (docData, res) => {
  const pei = docData.result || {};
  const student = docData.student || {};
  const escola = docData.escola;

  const nomeArquivo = `pei-${(student.full_name || "aluno").replace(/ /g, "-")}.pdf`;
  const doc = criarDoc(res, nomeArquivo);

  const nomeAluno = pei.identificacao?.nome_aluno || student.full_name || "—";
  let y = desenharCabecalho(doc, "PEI — Plano Educacional Individualizado",
    `Aluno: ${nomeAluno}  |  Período: ${docData.periodo || "—"}`);

  y = await desenharEscola(doc, escola, y);

  doc.rect(50, y, doc.page.width - 100, 60).fill("#f5f9ff").stroke(CORES.bordaClara);
  doc.fontSize(11).fillColor(CORES.azul).font("Helvetica-Bold").text("Identificação", 60, y + 8);
  doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
    .text(`Aluno: ${nomeAluno}   |   Série: ${pei.identificacao?.serie || student.grade || "—"}`, 60, y + 22);
  doc.text(`NEE: ${pei.identificacao?.deficiencia_nee || student.disability_type || "—"}   |   Período: ${pei.identificacao?.periodo || docData.periodo || "—"}`, 60, y + 36);
  y += 74;

  if (pei.diagnostico_pedagogico?.nivel_atual)
    y = desenharSecao(doc, "Diagnóstico Pedagógico",
      `Nível atual: ${pei.diagnostico_pedagogico.nivel_atual}\n\nEstilo de aprendizagem: ${pei.diagnostico_pedagogico.estilo_aprendizagem || "—"}`,
      CORES.azul, y);

  if (pei.diagnostico_pedagogico?.potencialidades?.length)
    y = desenharLista(doc, "Potencialidades", pei.diagnostico_pedagogico.potencialidades, CORES.verde, y);

  if (pei.diagnostico_pedagogico?.dificuldades?.length)
    y = desenharLista(doc, "Dificuldades", pei.diagnostico_pedagogico.dificuldades, CORES.amarelo, y);

  if (pei.objetivos?.curto_prazo?.length)
    y = desenharLista(doc, "Objetivos — Curto Prazo", pei.objetivos.curto_prazo.map(o => `${o.area}: ${o.meta}`), CORES.azul, y);

  if (pei.objetivos?.longo_prazo?.length)
    y = desenharLista(doc, "Objetivos — Longo Prazo", pei.objetivos.longo_prazo.map(o => `${o.area}: ${o.meta}`), CORES.roxo, y);

  if (pei.estrategias_pedagogicas?.length)
    y = desenharLista(doc, "Estratégias Pedagógicas", pei.estrategias_pedagogicas, CORES.verde, y);

  if (pei.aee) {
    const aeeResumo = [
      pei.aee.frequencia ? `Frequência: ${pei.aee.frequencia}` : "",
      pei.aee.local      ? `Local: ${pei.aee.local}`           : "",
      pei.aee.profissional ? `Profissional: ${pei.aee.profissional}` : ""
    ].filter(Boolean).join("  |  ");
    if (aeeResumo) y = desenharSecao(doc, "AEE — Atendimento Educacional Especializado", aeeResumo, CORES.roxo, y);
    if (pei.aee.atividades?.length) y = desenharLista(doc, "Atividades AEE", pei.aee.atividades, CORES.roxo, y);
  }

  if (pei.tecnologia_assistiva?.length)
    y = desenharLista(doc, "Tecnologia Assistiva", pei.tecnologia_assistiva.map(ta => `${ta.recurso}: ${ta.finalidade}`), CORES.azul, y);

  if (pei.avaliacao_processual?.instrumentos?.length)
    y = desenharLista(doc, "Instrumentos de Avaliação", pei.avaliacao_processual.instrumentos, CORES.cinza, y);

  if (pei.comunicacao_familia?.orientacoes_em_casa?.length)
    y = desenharLista(doc, "Orientações à Família", pei.comunicacao_familia.orientacoes_em_casa, CORES.verde, y);

  if (pei.equipe_multidisciplinar?.length)
    y = desenharLista(doc, "Equipe Multidisciplinar", pei.equipe_multidisciplinar.map(e => `${e.profissional}: ${e.papel}`), CORES.cinza, y);

  if (pei.base_legal)
    desenharSecao(doc, "Base Legal", pei.base_legal, CORES.cinza, y);

  doc.end();
};
