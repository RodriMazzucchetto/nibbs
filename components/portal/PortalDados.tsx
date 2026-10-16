"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  nome: string;
  email: string;
  celular: string | null;
  cpf: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

export function PortalDados({ profile, onFlash }: { profile: Profile; onFlash: (msg: string) => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: profile.nome,
    celular: profile.celular ?? "",
    cep: profile.cep ?? "",
    rua: profile.rua ?? "",
    numero: profile.numero ?? "",
    complemento: profile.complemento ?? "",
    bairro: profile.bairro ?? "",
    cidade: profile.cidade ?? "",
    uf: profile.uf ?? "",
  });
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");

  const h1: React.CSSProperties = {
    margin: 0,
    fontWeight: 900,
    fontVariationSettings: "'wdth' 62",
    fontSize: "clamp(44px, 5vw, 64px)",
    lineHeight: 0.9,
    textTransform: "uppercase",
  };

  const inputStyle: React.CSSProperties = {
    boxSizing: "border-box",
    height: 48,
    padding: "0 14px",
    border: "2px solid #261714",
    background: "#FFFFFF",
    fontSize: 16,
    width: "100%",
    borderRadius: 0,
    fontFamily: "inherit",
    color: "#261714",
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/portal/dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        onFlash(j.error || "Não foi possível salvar.");
        return;
      }

      if (senha || senha2) {
        const rs = await fetch("/api/portal/senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senha, senha2 }),
        });
        const js = await rs.json().catch(() => ({}));
        if (!rs.ok) {
          onFlash(js.error || "Dados salvos, mas a senha não foi atualizada.");
          return;
        }
        setSenha("");
        setSenha2("");
      }

      onFlash("Dados salvos.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, children: React.ReactNode, wide?: boolean) {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: wide ? "1 / -1" : undefined }}>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {children}
      </label>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 style={h1}>Dados e entrega</h1>
      <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Seus dados</h2>
            <span style={{ fontSize: 14, color: "#5E4B46" }}>Vieram da compra. Altere se precisar.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
            {field(
              "Nome",
              <input style={inputStyle} value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} required />,
            )}
            {field(
              "E-mail",
              <input style={{ ...inputStyle, borderColor: "#DDD3CE", background: "#EDE7E3", color: "#5E4B46" }} value={profile.email} disabled />,
            )}
            {field(
              "Celular",
              <input style={inputStyle} value={form.celular} onChange={(e) => setForm((s) => ({ ...s, celular: e.target.value }))} />,
            )}
            {field(
              "CPF",
              <input style={{ ...inputStyle, borderColor: "#DDD3CE", background: "#EDE7E3", color: "#5E4B46" }} value={profile.cpf ?? ""} disabled />,
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Endereço de entrega</h2>
            <span style={{ fontSize: 14, color: "#5E4B46" }}>Mudanças até o dia 20 valem para a próxima caixa.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 14 }}>
            {field("CEP", <input style={inputStyle} value={form.cep} onChange={(e) => setForm((s) => ({ ...s, cep: e.target.value }))} required />)}
            {field(
              "Rua e número",
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10 }}>
                <input style={inputStyle} value={form.rua} onChange={(e) => setForm((s) => ({ ...s, rua: e.target.value }))} required />
                <input style={inputStyle} value={form.numero} onChange={(e) => setForm((s) => ({ ...s, numero: e.target.value }))} required />
              </div>,
              true,
            )}
            {field("Complemento", <input style={inputStyle} value={form.complemento} onChange={(e) => setForm((s) => ({ ...s, complemento: e.target.value }))} />)}
            {field("Bairro", <input style={inputStyle} value={form.bairro} onChange={(e) => setForm((s) => ({ ...s, bairro: e.target.value }))} required />)}
            {field(
              "Cidade",
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 10 }}>
                <input style={inputStyle} value={form.cidade} onChange={(e) => setForm((s) => ({ ...s, cidade: e.target.value }))} required />
                <input style={inputStyle} value={form.uf} onChange={(e) => setForm((s) => ({ ...s, uf: e.target.value.toUpperCase() }))} required maxLength={2} />
              </div>,
              true,
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Senha</h2>
            <span style={{ fontSize: 14, color: "#5E4B46" }}>Opcional. Deixe em branco para manter a atual.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
            {field(
              "Nova senha",
              <input style={inputStyle} type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} />,
            )}
            {field(
              "Confirmar senha",
              <input style={inputStyle} type="password" autoComplete="new-password" placeholder="Repita a senha" value={senha2} onChange={(e) => setSenha2(e.target.value)} />,
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", boxSizing: "border-box", height: 48, padding: "0 20px", background: "#B3202F", color: "#F6F3F1", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center" }}
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
