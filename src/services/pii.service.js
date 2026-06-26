import { supabase } from "../config/supabase.js";

/**
 * Helpers de leitura/escrita de PII criptografada.
 * Backend é o único que pode ver os valores em claro — frontend nunca recebe.
 */

export async function readSchoolPII(schoolId) {
  const { data, error } = await supabase
    .from("schools")
    .select("id, cnpj_encrypted, phone_encrypted")
    .eq("id", schoolId)
    .single();

  if (error || !data) return null;

  const { data: cnpjData } = await supabase.rpc("decrypt_pii_safe", { cipher: data.cnpj_encrypted });
  const { data: phoneData } = await supabase.rpc("decrypt_pii_safe", { cipher: data.phone_encrypted });

  return {
    cnpj: cnpjData || null,
    phone: phoneData || null
  };
}

export async function writeSchoolPII(schoolId, { cnpj, phone }) {
  const updates = {};
  if (cnpj !== undefined) {
    const { data } = await supabase.rpc("encrypt_pii_safe", { plain: cnpj });
    updates.cnpj_encrypted = data;
  }
  if (phone !== undefined) {
    const { data } = await supabase.rpc("encrypt_pii_safe", { plain: phone });
    updates.phone_encrypted = data;
  }
  if (Object.keys(updates).length === 0) return;
  await supabase.from("schools").update(updates).eq("id", schoolId);
}

export async function maskCnpj(cnpj) {
  if (!cnpj) return null;
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.***.***/****-${clean.slice(-2)}`;
}

export async function maskPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 8) return phone;
  return `${clean.slice(0, 2)} *****-${clean.slice(-4)}`;
}
