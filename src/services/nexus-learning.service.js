import { saveMemory }
from "./memory.service.js";

// ✅ analisar aluno
export const analyzeStudentPattern =
async ({
  schoolId,
  student,
  averageScore,
  attendanceRate,
  adaptations
}) => {

  // 🔥 baixa frequência
  if (attendanceRate < 75) {

    await saveMemory({

      schoolId,

      studentId: student.id,

      type: "attendance_pattern",

      content:
        "Aluno apresenta baixa frequência recorrente.",

      metadata: {
        attendanceRate
      }
    });
  }

  // 🔥 dificuldade aprendizagem
  if (averageScore < 6) {

    await saveMemory({

      schoolId,

      studentId: student.id,

      type: "learning_pattern",

      content:
        "Aluno apresenta dificuldade contínua de aprendizagem.",

      metadata: {
        averageScore
      }
    });
  }

  // 🔥 adaptação
  if (adaptations?.length > 0) {

    await saveMemory({

      schoolId,

      studentId: student.id,

      type: "adaptation_pattern",

      content:
        "Aluno necessita adaptações pedagógicas contínuas.",

      metadata: {
        adaptations
      }
    });
  }

  return true;
};