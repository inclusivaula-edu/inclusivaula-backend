import { supabase } from "../config/supabase.js";

/**
 * Lembretes de atendimentos AEE por e-mail (Resend).
 * A cada 30 minutos, envia lembrete dos agendamentos das próximas 24h
 * que ainda não foram lembrados. Sem RESEND_API_KEY, degrada em log.
 */

const INTERVALO_MS = 30 * 60 * 1000;

async function enviarEmail(para, assunto, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("Lembretes: RESEND_API_KEY não configurada — e-mail não enviado.");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "InclusivAula <noreply@inclusivaula.com.br>",
      to: [para],
      subject: assunto,
      html
    })
  });
  if (!res.ok) {
    console.error("Lembretes: erro Resend", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

function htmlLembrete(professor, aluno, dataHora, duracao, tipo) {
  const quando = new Date(dataHora).toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  });
  return `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f5f9ff;">
  <h2 style="color: #2B9EC3; margin: 0 0 12px;">🔔 Lembrete de atendimento AEE</h2>
  <div style="background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #d3d1c7;">
    <p style="color: #2c2c2a; font-size: 14px; margin: 0 0 8px;">Olá, ${professor}!</p>
    <p style="color: #5f5e5a; font-size: 14px; line-height: 1.6; margin: 0;">
      Você tem um atendimento agendado:<br/><br/>
      <strong>Aluno:</strong> ${aluno}<br/>
      <strong>Quando:</strong> ${quando}<br/>
      <strong>Duração:</strong> ${duracao} minutos (${tipo})
    </p>
  </div>
  <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">
    InclusivAula · Após o atendimento, registre a sessão na plataforma.
  </p>
</div>`;
}

export async function processarLembretes() {
  try {
    const agora = new Date();
    const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

    const { data: agendamentos, error } = await supabase
      .from("aee_appointments")
      .select("id, user_id, student_id, data_hora, duracao_minutos, tipo_agrupamento")
      .eq("status", "agendado")
      .eq("lembrete_enviado", false)
      .gte("data_hora", agora.toISOString())
      .lte("data_hora", em24h.toISOString())
      .limit(50);

    if (error || !agendamentos?.length) return;

    for (const ag of agendamentos) {
      const [{ data: perfil }, { data: aluno }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", ag.user_id).single(),
        supabase.from("students").select("full_name").eq("id", ag.student_id).single()
      ]);
      if (!perfil?.email) continue;

      const ok = await enviarEmail(
        perfil.email,
        `🔔 Atendimento AEE amanhã: ${aluno?.full_name || "aluno"}`,
        htmlLembrete(
          perfil.full_name?.split(" ")[0] || "professor",
          aluno?.full_name || "—",
          ag.data_hora, ag.duracao_minutos, ag.tipo_agrupamento
        )
      );

      if (ok) {
        await supabase.from("aee_appointments")
          .update({ lembrete_enviado: true }).eq("id", ag.id);
        console.log(`🔔 Lembrete enviado: agendamento ${ag.id}`);
      }
    }
  } catch (err) {
    console.error("processarLembretes:", err.message);
  }
}

export function iniciarLembretes() {
  processarLembretes();
  setInterval(processarLembretes, INTERVALO_MS);
  console.log("🔔 Serviço de lembretes de agenda iniciado (a cada 30 min)");
}
