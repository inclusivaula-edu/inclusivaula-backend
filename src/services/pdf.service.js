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

// Desenha o cabeçalho padrão em todas as páginas
function desenharCabecalho(doc, titulo, subtitulo) {
  // Barra superior azul-verde
  doc.rect(0, 0, doc.page.width, 8).fill(CORES.azul);

  // Logo textual
  doc.fontSize(20).fillColor(CORES.azul).font("Helvetica-Bold").text("Inclusiv", 50, 25, { continued: true });
  doc.fillColor(CORES.verde).text("Aula");

  // Slogan
  doc.fontSize(8).fillColor(CORES.cinza).font("Helvetica")
    .text("Educação adaptada. Inclusão de verdade.", 50, 50);

  // Linha divisória
  doc.moveTo(50, 65).lineTo(doc.page.width - 50, 65).strokeColor(CORES.bordaClara).lineWidth(0.5).stroke();

  // Título do documento
  doc.fontSize(16).fillColor(CORES.azul).font("Helvetica-Bold")
    .text(titulo, 50, 80, { width: doc.page.width - 100 });

  if (subtitulo) {
    doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
      .text(subtitulo, 50, 102, { width: doc.page.width - 100 });
  }

  // Segunda linha divisória
  doc.moveTo(50, 122).lineTo(doc.page.width - 50, 122).strokeColor(CORES.azul).lineWidth(1).stroke();

  return 140; // retorna a posição Y após o cabeçalho
}

// Desenha o rodapé
function desenharRodape(doc) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y - 10).lineTo(doc.page.width - 50, y - 10)
    .strokeColor(CORES.bordaClara).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(CORES.cinza).font("Helvetica")
    .text(
      `Gerado por InclusivAula — www.inclusivaula.com.br — ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
      50, y, { align: "center", width: doc.page.width - 100 }
    );
}

// Desenha uma seção com título colorido e conteúdo
function desenharSecao(doc, titulo, conteudo, cor, y) {
  if (y > doc.page.height - 120) {
    doc.addPage();
    desenharRodape(doc);
    y = 60;
  }

  // Barra lateral colorida
  doc.rect(50, y, 3, 14).fill(cor || CORES.azul);

  // Título da seção
  doc.fontSize(11).fillColor(cor || CORES.azul).font("Helvetica-Bold")
    .text(titulo, 60, y + 1, { width: doc.page.width - 110 });

  y += 20;

  // Conteúdo
  doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica")
    .text(conteudo, 50, y, { width: doc.page.width - 100, align: "justify" });

  y += doc.heightOfString(conteudo, { width: doc.page.width - 100 }) + 16;

  return y;
}

// Desenha uma lista de itens com bullet
function desenharLista(doc, titulo, itens, cor, y) {
  if (!itens || itens.length === 0) return y;

  if (y > doc.page.height - 120) {
    doc.addPage();
    desenharRodape(doc);
    y = 60;
  }

  doc.rect(50, y, 3, 14).fill(cor || CORES.verde);
  doc.fontSize(11).fillColor(cor || CORES.verde).font("Helvetica-Bold")
    .text(titulo, 60, y + 1);
  y += 20;

  itens.forEach(item => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      desenharRodape(doc);
      y = 60;
    }
    const texto = typeof item === "string" ? item : JSON.stringify(item);
    doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica")
      .text(`• ${texto}`, 55, y, { width: doc.page.width - 105 });
    y += doc.heightOfString(`• ${texto}`, { width: doc.page.width - 105 }) + 6;
  });

  return y + 8;
}

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE RELATÓRIO PEDAGÓGICO
// ─────────────────────────────────────────────────────────────────
export const generateStudentReportPDF = async (reportData, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=relatorio-${reportData.student?.full_name?.replace(/ /g, "-") || "aluno"}.pdf`);
  doc.pipe(res);

  const rep = reportData.report || reportData;
  const aluno = reportData.student;
  const metrics = reportData.metrics;

  // Cabeçalho
  let y = desenharCabecalho(doc, rep.titulo || "Relatório Pedagógico", rep.periodo || "");

  // Bloco de dados do aluno
  doc.rect(50, y, doc.page.width - 100, 60).fill("#f5f9ff").stroke(CORES.bordaClara);
  doc.fontSize(11).fillColor(CORES.azul).font("Helvetica-Bold").text("Dados do aluno", 60, y + 8);
  doc.fontSize(10).fillColor(CORES.cinza).font("Helvetica")
    .text(`Nome: ${aluno?.full_name || rep.aluno?.nome || "—"}`, 60, y + 22);
  doc.text(`Série: ${aluno?.grade || rep.aluno?.serie || "—"}   |   Turma: ${aluno?.turma || rep.aluno?.turma || "—"}   |   NEE: ${aluno?.disability_type || rep.aluno?.nee || "—"}`, 60, y + 36);
  y += 74;

  // Métricas (se disponíveis)
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

  // Seções do relatório
  if (rep.sumario_executivo) y = desenharSecao(doc, "Sumário Executivo", rep.sumario_executivo, CORES.azul, y);
  if (rep.desenvolvimento_academico) y = desenharSecao(doc, "Desenvolvimento Acadêmico", rep.desenvolvimento_academico, CORES.azul, y);
  if (rep.desenvolvimento_social) y = desenharSecao(doc, "Desenvolvimento Social", rep.desenvolvimento_social, CORES.verde, y);
  if (rep.adaptacoes_aplicadas) y = desenharSecao(doc, "Adaptações Aplicadas", rep.adaptacoes_aplicadas, CORES.roxo, y);
  if (rep.pontos_positivos?.length) y = desenharLista(doc, "Pontos Positivos", rep.pontos_positivos, CORES.verde, y);
  if (rep.areas_de_atencao?.length) y = desenharLista(doc, "Áreas de Atenção", rep.areas_de_atencao, CORES.amarelo, y);
  if (rep.recomendacoes?.length) y = desenharLista(doc, "Recomendações Pedagógicas", rep.recomendacoes, CORES.azul, y);
  if (rep.metas_proxima_periodo?.length) y = desenharLista(doc, "Metas para o Próximo Período", rep.metas_proxima_periodo, CORES.roxo, y);
  if (rep.observacoes_finais) y = desenharSecao(doc, "Observações Finais", rep.observacoes_finais, CORES.cinza, y);
  if (rep.base_legal) y = desenharSecao(doc, "Base Legal e Científica", rep.base_legal, CORES.cinza, y);

  desenharRodape(doc);
  doc.end();
};

// ─────────────────────────────────────────────────────────────────
// GERAR PDF DE AULA
// ─────────────────────────────────────────────────────────────────
export const generateLessonPDF = async (lessonData, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const lesson = lessonData.result || lessonData;
  const input = lessonData.input || {};

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=aula-${(lesson.titulo || "aula").replace(/ /g, "-")}.pdf`);
  doc.pipe(res);

  // Cabeçalho
  const subtitulo = [input.serie, input.disciplina, input.periodo, input.deficiencia].filter(Boolean).join(" · ");
  let y = desenharCabecalho(doc, lesson.titulo || "Plano de Aula", subtitulo);

  // Estratégia pedagógica em destaque
  if (lesson.estrategia) {
    doc.rect(50, y, doc.page.width - 100, 0).fill("#e8f7fd");
    const h = doc.heightOfString(lesson.estrategia, { width: doc.page.width - 120 }) + 20;
    doc.rect(50, y, doc.page.width - 100, h).fill("#e8f7fd");
    doc.fontSize(10).fillColor(CORES.azul).font("Helvetica-Oblique")
      .text(lesson.estrategia, 60, y + 10, { width: doc.page.width - 120 });
    y += h + 12;
  }

  // BNCC
  if (lesson.bncc?.length) {
    if (y > doc.page.height - 120) { doc.addPage(); desenharRodape(doc); y = 60; }
    doc.rect(50, y, 3, 14).fill(CORES.roxo);
    doc.fontSize(11).fillColor(CORES.roxo).font("Helvetica-Bold").text("Habilidades BNCC", 60, y + 1);
    y += 20;
    lesson.bncc.forEach(b => {
      if (y > doc.page.height - 80) { doc.addPage(); desenharRodape(doc); y = 60; }
      doc.rect(50, y, doc.page.width - 100, 0);
      const hb = doc.heightOfString(b.descricao, { width: doc.page.width - 130 }) + 16;
      doc.rect(50, y, doc.page.width - 100, hb).fill("#EEEDFE");
      doc.fontSize(9).fillColor(CORES.roxo).font("Helvetica-Bold").text(`[${b.codigo}]`, 58, y + 6);
      doc.fontSize(9).fillColor("#2c2c2a").font("Helvetica").text(b.descricao, 100, y + 6, { width: doc.page.width - 150 });
      y += hb + 4;
    });
    y += 8;
  }

  if (lesson.explicacao) y = desenharSecao(doc, "Explicação do Conteúdo", lesson.explicacao, CORES.azul, y);

  // Atividades
  if (lesson.atividades?.length) {
    if (y > doc.page.height - 120) { doc.addPage(); desenharRodape(doc); y = 60; }
    doc.rect(50, y, 3, 14).fill(CORES.verde);
    doc.fontSize(11).fillColor(CORES.verde).font("Helvetica-Bold").text("Atividades", 60, y + 1);
    y += 20;
    lesson.atividades.forEach((a, i) => {
      if (y > doc.page.height - 80) { doc.addPage(); desenharRodape(doc); y = 60; }
      const texto = typeof a === "string" ? a.replace(/^atividade\s*\d+[:\-]?\s*/i, "") : a.descricao || JSON.stringify(a);
      doc.fontSize(10).fillColor(CORES.verde).font("Helvetica-Bold").text(`Atividade ${i + 1}`, 50, y);
      y += 14;
      doc.fontSize(10).fillColor("#2c2c2a").font("Helvetica").text(texto, 55, y, { width: doc.page.width - 105 });
      y += doc.heightOfString(texto, { width: doc.page.width - 105 }) + 10;
    });
    y += 4;
  }

  if (lesson.adaptacoes?.length) y = desenharLista(doc, "Adaptações Inclusivas", lesson.adaptacoes.map(a => typeof a === "string" ? a : JSON.stringify(a)), CORES.azul, y);
  if (lesson.recursos?.length) y = desenharLista(doc, "Recursos Didáticos", lesson.recursos.map(r => typeof r === "string" ? r : JSON.stringify(r)), CORES.verde, y);
  if (lesson.avaliacao) y = desenharSecao(doc, "Avaliação", lesson.avaliacao, CORES.azul, y);
  if (lesson.base_legal) y = desenharSecao(doc, "Base Legal e Científica", lesson.base_legal, CORES.cinza, y);

  desenharRodape(doc);
  doc.end();
};