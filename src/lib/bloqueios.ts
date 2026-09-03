import "server-only";

import { banco } from "./banco";
import { lerPeriodo, montarPeriodo } from "./periodo";
import { deChave } from "./agenda";

/**
 * Bloqueios: férias, feriado, curso, compromisso — qualquer janela em que a
 * Karol não atende. O motor de horários (`ocupadosNoPeriodo` em
 * `agendamentos.ts`) já soma os bloqueios ao que está ocupado; aqui é só o
 * CRUD que o painel usa.
 */

export type Bloqueio = {
  id: string;
  inicio: Date;
  fim: Date;
  motivo: string;
  /** true quando cobre um ou mais dias inteiros (00:00 a 00:00). */
  diaInteiro: boolean;
};

function ehMeiaNoite(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0;
}

/** Bloqueios que ainda não terminaram, do mais próximo pro mais distante. */
export async function listarBloqueios(): Promise<Bloqueio[]> {
  const bd = banco();
  if (!bd) return [];

  const { data } = await bd.from("bloqueios").select("*");
  const agora = Date.now();

  return (data ?? [])
    .map((r): Bloqueio | null => {
      const p = lerPeriodo(r.periodo as string);
      if (!p) return null;
      return {
        id: r.id as string,
        inicio: p.inicio,
        fim: p.fim,
        motivo: r.motivo as string,
        diaInteiro: ehMeiaNoite(p.inicio) && ehMeiaNoite(p.fim),
      };
    })
    .filter((b): b is Bloqueio => b !== null && b.fim.getTime() > agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

const HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export async function criarBloqueio(dados: {
  dataInicio: string; // AAAA-MM-DD
  dataFim: string; // AAAA-MM-DD
  horaInicio?: string; // HH:MM — vazio = dia inteiro
  horaFim?: string; // HH:MM
  motivo: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };

  const motivo = dados.motivo.trim();
  if (motivo.length < 2 || motivo.length > 200) {
    return { ok: false, erro: "Escreva um motivo (2 a 200 caracteres)." };
  }

  const di = deChave(dados.dataInicio);
  const df = deChave(dados.dataFim);
  if (Number.isNaN(di.getTime()) || Number.isNaN(df.getTime())) {
    return { ok: false, erro: "Datas inválidas." };
  }
  if (df < di) {
    return { ok: false, erro: "A data final é antes da inicial." };
  }

  const temHora = Boolean(dados.horaInicio || dados.horaFim);
  let inicio: Date;
  let fim: Date;

  if (temHora) {
    if (!dados.horaInicio || !dados.horaFim) {
      return { ok: false, erro: "Preencha as duas horas, ou deixe as duas em branco." };
    }
    const mi = dados.horaInicio.match(HORA);
    const mf = dados.horaFim.match(HORA);
    if (!mi || !mf) return { ok: false, erro: "Hora no formato HH:MM." };

    inicio = new Date(di);
    inicio.setHours(Number(mi[1]), Number(mi[2]), 0, 0);
    fim = new Date(df);
    fim.setHours(Number(mf[1]), Number(mf[2]), 0, 0);
  } else {
    // dia(s) inteiro(s): do começo do primeiro ao começo do dia seguinte ao último
    inicio = new Date(di);
    inicio.setHours(0, 0, 0, 0);
    fim = new Date(df);
    fim.setHours(0, 0, 0, 0);
    fim.setDate(fim.getDate() + 1);
  }

  if (fim <= inicio) {
    return { ok: false, erro: "A hora final precisa ser depois da inicial." };
  }

  const { error } = await bd
    .from("bloqueios")
    .insert({ periodo: montarPeriodo(inicio, fim), motivo });

  if (error) return { ok: false, erro: "Não consegui salvar o bloqueio." };
  return { ok: true };
}

export async function removerBloqueio(id: string): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return { ok: false, erro: "Bloqueio inválido." };

  const { error } = await bd.from("bloqueios").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não consegui remover." };
  return { ok: true };
}
