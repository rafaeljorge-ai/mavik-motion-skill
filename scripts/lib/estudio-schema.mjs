/** Esquema do estúdio (mavik-create-motions). Sem dependências; só leitura e validação. */
export const ESQUEMA_VERSAO = 1;
export const ETAPAS = ['pauta', 'fatos', 'roteiro', 'voz', 'tempos', 'cenas', 'piloto', 'render', 'final', 'publicado'];
export const APROVACOES = ['roteiro', 'piloto', 'final'];

// Campos que a entrevista precisa preencher. `pergunta` é o texto que o agente usa, um por vez.
export const CAMPOS_MARCA = [
  ['nome', 'Qual o nome que aparece para o público (você, a empresa ou o cliente)?'],
  ['descricao', 'O que a marca é, em uma ou duas frases (o que faz e para quem)?'],
  ['handle', 'Qual o @ do perfil onde a série vai sair?'],
  ['cores.fundo', 'Cor de fundo principal (hex)?'],
  ['cores.texto', 'Cor do texto (hex)?'],
  ['cores.destaque', 'Cor de destaque (hex)?'],
  ['fontes.principal', 'Fonte principal?'],
  ['tom', 'Como a marca fala (3 a 5 palavras)?'],
  ['proibido', 'O que a marca nunca diz ou promete?'],
  ['fonte_dos_dados', 'De onde vieram esses dados (design system, manual de marca, aprovação na conversa)?'],
];
export const CAMPOS_SERIE = [
  ['nome', 'Qual o nome interno da série?'],
  ['linha_editorial', 'Qual a linha editorial (o que cada episódio sempre entrega)?'],
  ['publico', 'Para quem é a série?'],
  ['formato', 'Qual formato visual (ex.: motion-interface)?'],
  ['duracao_segundos', 'Duração alvo em segundos?'],
  ['voz.provedor', 'Voz: qual provedor (fish, elevenlabs, propria, nenhuma)?'],
  ['voz.id', 'Voz: qual o id ou o nome da voz?'],
  ['voz.plano', 'Voz: plano grátis ou pago (o grátis costuma ser não comercial)?'],
  ['trilha.direcao', 'Trilha: qual clima?'],
  ['trilha.direitos', 'Trilha: original, licenciada ou nenhuma?'],
  ['cta.texto', 'Qual o texto exato do CTA no fim?'],
  ['frases_proibidas', 'Alguma frase ou promessa proibida na série?'],
  ['cadencia', 'Com que frequência sai episódio?'],
];

export function pegar(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function vazio(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}
/** Lista o que falta perguntar. `confirmado` só vale se a pessoa confirmou de fato. */
export function faltando(obj, campos) {
  return campos.filter(([c]) => vazio(pegar(obj, c))).map(([campo, pergunta]) => ({ campo, pergunta }));
}
export function validarMarca(m) {
  const erros = [];
  for (const k of ['fundo', 'texto', 'destaque']) {
    const v = pegar(m, 'cores.' + k);
    if (!vazio(v) && !/^#[0-9a-fA-F]{6}$/.test(v)) erros.push(`cores.${k} precisa ser hex #RRGGBB (veio "${v}")`);
  }
  if (!vazio(m.handle) && !String(m.handle).startsWith('@')) erros.push('handle precisa começar com @');
  const falta = faltando(m, CAMPOS_MARCA);
  return { erros, falta, pronta: erros.length === 0 && falta.length === 0 && m.confirmado === true };
}
export function validarSerie(s) {
  const erros = [];
  if (!vazio(s.duracao_segundos) && !(Number(s.duracao_segundos) > 0 && Number(s.duracao_segundos) <= 180)) erros.push('duracao_segundos entre 1 e 180');
  if (!vazio(pegar(s, 'trilha.direitos')) && !['original', 'licenciada', 'nenhuma'].includes(s.trilha.direitos)) erros.push('trilha.direitos: original, licenciada ou nenhuma');
  if (!vazio(pegar(s, 'voz.plano')) && !['gratis', 'pago', 'propria'].includes(s.voz.plano)) erros.push('voz.plano: gratis, pago ou propria');
  const falta = faltando(s, CAMPOS_SERIE);
  const avisos = [];
  if (pegar(s, 'voz.plano') === 'gratis') avisos.push('Voz em plano grátis: costuma ser só para uso não comercial. Confira os termos antes de publicar.');
  return { erros, falta, avisos, pronta: erros.length === 0 && falta.length === 0 && s.confirmado === true };
}
export function validarEstado(e) {
  const erros = [];
  if (!ETAPAS.includes(e.etapa)) erros.push(`etapa inválida: ${e.etapa}`);
  for (const a of e.aprovacoes || []) {
    if (!APROVACOES.includes(a.etapa)) erros.push(`aprovação de etapa inválida: ${a.etapa}`);
    if (vazio(a.por) || vazio(a.frase) || String(a.frase).trim().length < 2) erros.push(`aprovação de ${a.etapa} sem quem aprovou ou sem a frase exata`);
  }
  return erros;
}
