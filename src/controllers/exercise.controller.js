import { supabase } from "../config/supabase.js";
import { runNexus7Exercises } from "../nexus7/nexus7-exercises.js";
import { runNexus7Rubrica } from "../nexus7/nexus7-rubrica.js";
import { internalError } from "../utils/sanitize.js";
import PDFDocument from "pdfkit";

export const generateExercises = async (req, res) => {
  try {
    const { lessonId, studentId, quantidade = 5 } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: "lessonId é obrigatório" });
    }

    const qtd = Math.min(Math.max(Number(quantidade) || 5, 1), 20);

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons").select("*")
      .eq("id", lessonId)
      .eq("teacher_id", req.user?.id)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ success: false, error: "Aula não encontrada" });
    }

    let student = null;
    if (studentId) {
      const { data } = await supabase
        .from("students").select("*")
        .eq("id", studentId)
        .eq("school_id", req.schoolId)
        .single();
      student = data;
      if (!student) {
        return res.status(404).json({ success: false, error: "Aluno não encontrado" });
      }
    }

    const exercicios = await runNexus7Exercises({ lesson, student, quantidade: qtd });

    const { data: saved, error: saveError } = await supabase
      .from("activities")
      .insert([{
        lesson_id: lessonId,
        school_id: req.schoolId,
        teacher_id: req.user?.id,
        title: exercicios.titulo,
        description: exercicios.instrucoes,
        activity_type: "exercicios_adaptados",
        questions: exercicios.exercicios,
        gabarito: {
          criterios: exercicios.criterios_avaliacao,
          pontuacao_maxima: exercicios.pontuacao_maxima
        },
        status: "draft"
      }])
      .select().single();

    if (saveError) throw new Error(saveError.message);

    return res.json({ success: true, activityId: saved.id, data: exercicios });

  } catch (error) {
    console.error("❌ ERRO generateExercises:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getExercisesByLesson = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("lesson_id", req.params.lessonId)
      .eq("school_id", req.schoolId)
      .eq("activity_type", "exercicios_adaptados")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const registerGrade = async (req, res) => {
  try {
    const { activityId, studentId, score, feedback } = req.body;

    if (!activityId || !studentId || score === undefined || score === null) {
      return res.status(400).json({ success: false, error: "activityId, studentId e score são obrigatórios" });
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      return res.status(400).json({ success: false, error: "score deve ser um número entre 0 e 10" });
    }

    // Verifica que o aluno pertence à escola do professor
    const { data: student } = await supabase
      .from("students").select("id")
      .eq("id", studentId).eq("school_id", req.schoolId).single();

    if (!student) {
      return res.status(404).json({ success: false, error: "Aluno não encontrado" });
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert([{
        student_id: studentId,
        school_id: req.schoolId,
        title: "Avaliação de exercícios",
        score: numScore,
        max_score: 10,
        feedback: feedback ? String(feedback).substring(0, 1000) : null,
        evaluation_date: new Date().toISOString().split("T")[0]
      }])
      .select().single();

    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const generateRubrica = async (req, res) => {
  try {
    const { lessonId, studentId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: "lessonId é obrigatório" });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons").select("*")
      .eq("id", lessonId)
      .eq("teacher_id", req.user?.id)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ success: false, error: "Aula não encontrada" });
    }

    if (lesson.status !== "completed" || !lesson.result) {
      return res.status(400).json({ success: false, error: "Aula ainda não foi gerada" });
    }

    let student = null;
    if (studentId) {
      const { data } = await supabase
        .from("students").select("*")
        .eq("id", studentId)
        .eq("school_id", req.schoolId)
        .single();
      student = data;
      if (!student) {
        return res.status(404).json({ success: false, error: "Aluno não encontrado" });
      }
    }

    const rubrica = await runNexus7Rubrica({ lesson, student });

    return res.json({ success: true, data: rubrica });
  } catch (error) {
    console.error("generateRubrica:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteAvaliacao = async (req, res) => {
  try {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", req.params.id)
      .eq("teacher_id", req.user.id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

const CORES_PDF = {
  azul: "#2B9EC3",
  verde: "#4CAF82",
  roxo: "#534AB7",
  amarelo: "#BA7517",
  cinza: "#5f5e5a",
  cinzaClaro: "#f1efe8"
};

export const getAvaliacaoPDF = async (req, res) => {
  try {
    const { data: atividade, error: err } = await supabase
      .from("activities")
      .select("*")
      .eq("id", req.params.id)
      .eq("teacher_id", req.user.id)
      .single();

    if (err || !atividade) return res.status(404).json({ success: false, error: "Avaliação não encontrada" });

    const tipo = req.query.tipo || "aluno";
    const questoes = atividade.questions || [];
    const partes = atividade.description?.split(" · ") || [];
    const disciplina = partes[0] || "Avaliação";
    const periodo = partes[1] || "";

    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const buffers = [];
    doc.on("data", b => buffers.push(b));
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="avaliacao-${tipo}-${atividade.id.slice(0,8)}.pdf"`);
      res.send(pdf);
    });

    doc.fontSize(18).fillColor(CORES_PDF.roxo).text(atividade.title || "Avaliação", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(CORES_PDF.cinza).text(`${disciplina}${periodo ? " | " + periodo : ""}`, { align: "center" });
    if (tipo === "aluno") {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor(CORES_PDF.cinza).text("Nome: ____________________________________________  Data: ___/___/______");
    }
    doc.moveDown(1);

    questoes.forEach((q, i) => {
      if (doc.y > 680) doc.addPage();

      const nivel = q.nivel === "basico" ? "Básico" : q.nivel === "intermediario" ? "Intermediário" : "Avançado";
      const tipoLabel = q.tipo === "multipla_escolha" ? "Múltipla escolha" : q.tipo === "verdadeiro_falso" ? "V ou F" : "Dissertativo";
      doc.fontSize(10).fillColor(CORES_PDF.cinza).text(`Questão ${q.numero || i + 1} — ${tipoLabel} — ${nivel}`);
      doc.fontSize(12).fillColor("#2c2c2a").text(q.enunciado);
      doc.moveDown(0.3);

      if (q.tipo === "multipla_escolha" && q.opcoes?.length) {
        q.opcoes.forEach(op => {
          const isCorreta = op.startsWith(q.resposta_correta);
          if (tipo === "gabarito" && isCorreta) {
            doc.fontSize(11).fillColor(CORES_PDF.verde).text(`  ✓ ${op}`);
          } else {
            doc.fontSize(11).fillColor("#2c2c2a").text(`  ○ ${op}`);
          }
        });
        if (tipo === "gabarito" && q.justificativa) {
          doc.moveDown(0.2);
          doc.fontSize(10).fillColor(CORES_PDF.roxo).text(`Justificativa: ${q.justificativa}`);
        }
      } else if (q.tipo === "dissertativo" || q.tipo === "pergunta_aberta") {
        if (tipo === "aluno") {
          doc.moveDown(0.3);
          for (let l = 0; l < 4; l++) {
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(CORES_PDF.cinzaClaro);
            doc.moveDown(1);
          }
        } else {
          doc.fontSize(11).fillColor(CORES_PDF.verde).text(`Resposta esperada: ${q.resposta_correta || ""}`);
          if (q.justificativa) {
            doc.fontSize(10).fillColor(CORES_PDF.roxo).text(`Justificativa: ${q.justificativa}`);
          }
        }
      } else if (q.tipo === "verdadeiro_falso") {
        if (tipo === "aluno") {
          doc.fontSize(11).fillColor("#2c2c2a").text("  ( ) Verdadeiro     ( ) Falso");
        } else {
          doc.fontSize(11).fillColor(CORES_PDF.verde).text(`  Resposta: ${q.resposta_correta}`);
          if (q.justificativa) {
            doc.fontSize(10).fillColor(CORES_PDF.roxo).text(`  Justificativa: ${q.justificativa}`);
          }
        }
      } else if (q.tipo === "completar" || q.tipo === "associar" || q.tipo === "desenhar") {
        if (tipo === "aluno") {
          doc.moveDown(0.3);
          for (let l = 0; l < 3; l++) {
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(CORES_PDF.cinzaClaro);
            doc.moveDown(1);
          }
        } else {
          doc.fontSize(11).fillColor(CORES_PDF.verde).text(`Resposta: ${q.resposta_correta || ""}`);
        }
      }

      if (tipo === "gabarito" && q.adaptacao) {
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(CORES_PDF.azul).text(`Adaptação NEE: ${q.adaptacao}`);
      }

      doc.moveDown(0.8);
    });

    if (tipo === "gabarito" && atividade.gabarito) {
      doc.moveDown(0.5);
      if (atividade.gabarito.criterios) {
        doc.fontSize(11).fillColor(CORES_PDF.roxo).text("Critérios de avaliação:", { underline: true });
        doc.fontSize(10).fillColor(CORES_PDF.cinza).text(atividade.gabarito.criterios);
      }
      if (atividade.gabarito.pontuacao_maxima) {
        doc.fontSize(10).fillColor(CORES_PDF.cinza).text(`Pontuação máxima: ${atividade.gabarito.pontuacao_maxima}`);
      }
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor(CORES_PDF.cinza).text("Gerado por InclusivAula — www.inclusivaula.com.br", { align: "center" });
    if (tipo === "gabarito") {
      doc.fontSize(9).fillColor(CORES_PDF.amarelo).text("DOCUMENTO EXCLUSIVO DO PROFESSOR — NÃO DISTRIBUA AOS ALUNOS", { align: "center" });
    }

    doc.end();
  } catch (error) {
    console.error("getAvaliacaoPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: internalError(error) });
    }
  }
};