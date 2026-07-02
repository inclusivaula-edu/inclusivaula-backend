import { createSimuladoJob, getSimulado, listSimulados } from "../services/simulado.service.js";
import { supabase } from "../config/supabase.js";
import { internalError } from "../utils/sanitize.js";
import PDFDocument from "pdfkit";

export const generateSimulado = async (req, res) => {
  try {
    const { disciplinas, grade, periodo, questoes_por_disciplina, tipos_questao, student_id, class_id } = req.body;

    if (!disciplinas?.length || !grade || !periodo) {
      return res.status(400).json({ success: false, error: "Disciplinas, série e período são obrigatórios" });
    }

    const job = await createSimuladoJob({
      ...req.body,
      user_id: req.user.id,
      school_id: req.schoolId
    });

    return res.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("generateSimulado:", error.message);
    const isLimit = error.message?.includes("Aguarde");
    return res.status(isLimit ? 429 : 500).json({ success: false, error: isLimit ? error.message : internalError(error) });
  }
};

export const getSimuladoStatus = async (req, res) => {
  try {
    const sim = await getSimulado(req.params.id);
    if (!sim) return res.status(404).json({ success: false, error: "Simulado não encontrado" });
    if (sim.teacher_id !== req.user.id) return res.status(403).json({ success: false, error: "Acesso negado" });

    return res.json({ success: true, status: sim.status, data: sim.result, simulado: sim });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const listSimuladosHandler = async (req, res) => {
  try {
    const data = await listSimulados(req.schoolId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteSimulado = async (req, res) => {
  try {
    const { error } = await supabase
      .from("simulados")
      .delete()
      .eq("id", req.params.id)
      .eq("teacher_id", req.user.id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

const CORES = {
  azul: "#2B9EC3",
  verde: "#4CAF82",
  roxo: "#534AB7",
  amarelo: "#BA7517",
  cinza: "#5f5e5a",
  cinzaClaro: "#f1efe8"
};

export const getSimuladoPDF = async (req, res) => {
  try {
    const sim = await getSimulado(req.params.id);
    if (!sim) return res.status(404).json({ success: false, error: "Simulado não encontrado" });
    if (sim.teacher_id !== req.user.id) return res.status(403).json({ success: false, error: "Acesso negado" });
    if (sim.status !== "completed" || !sim.result) {
      return res.status(400).json({ success: false, error: "Simulado ainda não foi gerado" });
    }

    const tipo = req.query.tipo || "aluno";
    const result = sim.result;
    const questoes = result.questoes || [];

    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const buffers = [];
    doc.on("data", b => buffers.push(b));
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="simulado-${tipo}-${sim.id.slice(0,8)}.pdf"`);
      res.send(pdf);
    });

    doc.fontSize(18).fillColor(CORES.roxo).text(result.titulo || "Simulado", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(CORES.cinza).text(`${sim.grade} | ${sim.periodo} | ${sim.disciplinas.join(", ")}`, { align: "center" });
    if (tipo === "aluno") {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor(CORES.cinza).text("Nome: ____________________________________________  Data: ___/___/______");
    }
    doc.moveDown(1);

    let discAtual = "";
    questoes.forEach((q, i) => {
      if (doc.y > 680) doc.addPage();

      if (q.disciplina !== discAtual) {
        discAtual = q.disciplina;
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor(CORES.azul).text(discAtual, { underline: true });
        doc.moveDown(0.5);
      }

      const badgeDif = q.dificuldade === "facil" ? "Fácil" : q.dificuldade === "medio" ? "Médio" : "Difícil";
      doc.fontSize(10).fillColor(CORES.cinza).text(`Questão ${q.numero} — ${badgeDif} — ${q.habilidade_bncc || ""}`, { continued: false });
      doc.fontSize(12).fillColor("#2c2c2a").text(q.enunciado);
      doc.moveDown(0.3);

      if (q.tipo === "multipla_escolha" && q.alternativas) {
        q.alternativas.forEach(alt => {
          if (tipo === "gabarito" && alt.startsWith(q.resposta_correta + ")")) {
            doc.fontSize(11).fillColor(CORES.verde).text(`  ✓ ${alt}`);
          } else {
            doc.fontSize(11).fillColor("#2c2c2a").text(`  ○ ${alt}`);
          }
        });
        if (tipo === "gabarito" && q.justificativa) {
          doc.moveDown(0.2);
          doc.fontSize(10).fillColor(CORES.roxo).text(`Justificativa: ${q.justificativa}`);
        }
      } else if (q.tipo === "discursiva") {
        if (tipo === "aluno") {
          doc.moveDown(0.3);
          for (let l = 0; l < 4; l++) {
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(CORES.cinzaClaro);
            doc.moveDown(1);
          }
        } else {
          doc.fontSize(11).fillColor(CORES.verde).text(`Resposta esperada: ${q.resposta_esperada || ""}`);
          if (q.criterios_correcao) {
            doc.fontSize(10).fillColor(CORES.roxo).text(`Critérios: ${q.criterios_correcao}`);
          }
        }
      } else if (q.tipo === "verdadeiro_falso") {
        if (tipo === "aluno") {
          doc.fontSize(11).fillColor("#2c2c2a").text("  ( ) Verdadeiro     ( ) Falso");
        } else {
          doc.fontSize(11).fillColor(CORES.verde).text(`  Resposta: ${q.resposta_correta === "V" ? "Verdadeiro" : "Falso"}`);
          if (q.justificativa) {
            doc.fontSize(10).fillColor(CORES.roxo).text(`  Justificativa: ${q.justificativa}`);
          }
        }
      }

      doc.moveDown(0.8);
    });

    doc.moveDown(1);
    doc.fontSize(9).fillColor(CORES.cinza).text("Gerado por InclusivAula — www.inclusivaula.com.br", { align: "center" });
    if (tipo === "gabarito") {
      doc.fontSize(9).fillColor(CORES.amarelo).text("DOCUMENTO EXCLUSIVO DO PROFESSOR — NÃO DISTRIBUA AOS ALUNOS", { align: "center" });
    }

    doc.end();
  } catch (error) {
    console.error("getSimuladoPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: internalError(error) });
    }
  }
};
