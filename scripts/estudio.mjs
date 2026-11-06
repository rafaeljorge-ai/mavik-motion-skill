#!/usr/bin/env node
/**
 * mavik-create-motions · estúdio de série
 * Cria e mantém a estrutura de pastas e a memória em arquivos de uma série de vídeos.
 * Regras: sem rede, sem instalar nada, nunca apaga nem sobrescreve arquivo existente
 * (exceto o bloco marcado do CLAUDE.md/AGENTS.md e os JSON de estado que ele mesmo mantém).
 * Sem --yes, só mostra o que faria (prévia).
 *
 * uso:
 *   node scripts/estudio.mjs init      --dir PASTA [--modelo examples/rafaeljorge-noticias-ia] [--yes]
 *   node scripts/estudio.mjs serie     --dir PASTA --nome SLUG [--formato motion-interface] [--yes]
 *   node scripts/estudio.mjs episodio  --dir PASTA [--serie SLUG] --nome SLUG [--yes]
 *   node scripts/estudio.mjs status    --dir PASTA [--json]
 *   node scripts/estudio.mjs aprovar   --dir PASTA --episodio NNN-slug --etapa roteiro|piloto|final --por NOME --frase "texto exato"
 *   node scripts/estudio.mjs etapa     --dir PASTA --episodio NNN-slug --para ETAPA
 * Saída: 0 ok · 1 erro de dados/operação · 2 erro de uso · 4 falta algo (entrevista pendente).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESQUEMA_VERSAO, ETAPAS, validarMarca, validarSerie, validarEstado } from './lib/estudio-schema.mjs';

const RAIZ_SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSAO = JSON.parse(readFileSync(path.join(RAIZ_SKILL, 'package.json'), 'utf8')).version;
const INICIO = '<!-- mavik-create-motions:inicio -->';
const FIM = '<!-- mavik-create-motions:fim -->';

export class ErroUso extends Error { constructor(m) { super(m); this.codigo = 2; } }
export class ErroDados extends Error { constructor(m) { super(m); this.codigo = 1; } }

const lerJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const hoje = () => new Date().toISOString().slice(0, 10);
const slugOk = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || '');

/** Plano de escrita: lista de {tipo:'pasta'|'arquivo'|'bloco'|'estado', caminho, conteudo}. */
function plano() {
  const passos = [];
  const planejado = new Set();
  const livre = (p) => !existsSync(p) && !planejado.has(p) && planejado.add(p);
  return {
    passos,
    pasta(p) { if (livre(p)) passos.push({ tipo: 'pasta', caminho: p }); },
    arquivo(p, conteudo) { if (livre(p)) passos.push({ tipo: 'arquivo', caminho: p, conteudo }); else if (existsSync(p)) passos.push({ tipo: 'mantido', caminho: p }); },
    estado(p, conteudo) { passos.push({ tipo: 'estado', caminho: p, conteudo }); },
    bloco(p, bloco) { passos.push({ tipo: 'bloco', caminho: p, conteudo: bloco }); },
    copia(origem, p) { if (livre(p)) passos.push({ tipo: 'copia', origem, caminho: p }); else if (existsSync(p)) passos.push({ tipo: 'mantido', caminho: p }); },
  };
}
function aplicar(pl, executar) {
  if (!executar) return pl.passos.map((x) => ({ ...x, conteudo: undefined, feito: false }));
  for (const x of pl.passos) {
    if (x.tipo === 'pasta') mkdirSync(x.caminho, { recursive: true });
    else if (x.tipo === 'arquivo') { mkdirSync(path.dirname(x.caminho), { recursive: true }); writeFileSync(x.caminho, x.conteudo, { flag: 'wx' }); }
    else if (x.tipo === 'copia') { mkdirSync(path.dirname(x.caminho), { recursive: true }); copyFileSync(x.origem, x.caminho); }
    else if (x.tipo === 'estado') { mkdirSync(path.dirname(x.caminho), { recursive: true }); writeFileSync(x.caminho, x.conteudo); }
    else if (x.tipo === 'bloco') escreverBloco(x.caminho, x.conteudo);
  }
  return pl.passos.map((x) => ({ ...x, conteudo: undefined, feito: x.tipo !== 'mantido' }));
}
/** Insere ou troca só o bloco marcado; o resto do arquivo da pessoa fica intacto. */
export function escreverBloco(arquivo, bloco) {
  const novo = `${INICIO}\n${bloco.trim()}\n${FIM}\n`;
  if (!existsSync(arquivo)) { writeFileSync(arquivo, novo); return 'criado'; }
  const atual = readFileSync(arquivo, 'utf8');
  const i = atual.indexOf(INICIO), f = atual.indexOf(FIM);
  if (i >= 0 && f > i) { writeFileSync(arquivo, atual.slice(0, i) + novo + atual.slice(f + FIM.length).replace(/^\n/, '')); return 'atualizado'; }
  writeFileSync(arquivo, atual.replace(/\n*$/, '\n\n') + novo); return 'acrescentado';
}

function blocoInstrucoes() {
  return `# Estúdio de série (mavik-create-motions)

Esta pasta é um estúdio de série de vídeos. **Antes de qualquer coisa, leia nesta ordem:**
1. \`estudio.json\` (série ativa e caminhos)
2. \`marca/marca.json\` e \`marca/voz-da-marca.md\`
3. \`series/<serie-ativa>/serie.json\`
4. \`series/<serie-ativa>/biblia.md\` (o estilo em números)
5. \`series/<serie-ativa>/erros-corrigidos.md\` (correções que viraram regra; valem acima de tudo)
6. \`estado.json\` do episódio aberto

Rode \`node <skill>/scripts/estudio.mjs status --dir .\` para saber o próximo passo.
O que está nesses arquivos vale mais do que a memória do modelo. Não pergunte de novo o que já está escrito.
Pare para o ok da pessoa no roteiro, no piloto e no final; registre com \`estudio.mjs aprovar\` e a frase exata. Silêncio não é aprovação.
Não instale nada, não gaste créditos e não publique sem autorização.`;
}

export function cmdInit({ dir, modelo, yes }) {
  if (!dir) throw new ErroUso('--dir é obrigatório');
  const D = path.resolve(dir);
  const pl = plano();
  for (const p of ['', 'marca', 'marca/ativos', 'series', 'referencias', 'motor', '.mavik']) pl.pasta(path.join(D, p));
  let marca = { esquema: ESQUEMA_VERSAO, confirmado: false, nome: '', descricao: '', handle: '', cores: { fundo: '', texto: '', destaque: '' }, fontes: { principal: '', tecnica: '' }, tom: [], proibido: [], cta_padrao: '', fonte_dos_dados: '' };
  let serieAtiva = '';
  if (modelo) {
    const M = path.resolve(modelo);
    if (!existsSync(path.join(M, 'marca.json'))) throw new ErroDados(`modelo sem marca.json: ${modelo}`);
    marca = lerJson(path.join(M, 'marca.json'));
    pl.copia(path.join(M, 'voz-da-marca.md'), path.join(D, 'marca/voz-da-marca.md'));
    for (const s of readdirSync(path.join(M, 'series'))) {
      serieAtiva ||= s;
      const SD = path.join(D, 'series', s);
      pl.pasta(path.join(SD, 'episodios'));
      for (const f of readdirSync(path.join(M, 'series', s))) pl.copia(path.join(M, 'series', s, f), path.join(SD, f));
    }
  }
  pl.arquivo(path.join(D, 'marca/marca.json'), json(marca));
  pl.arquivo(path.join(D, 'marca/voz-da-marca.md'), '# Como a marca fala\n\n- Tom:\n- Palavras e promessas proibidas:\n- Exemplos aprovados:\n');
  pl.arquivo(path.join(D, 'estudio.json'), json({ esquema: ESQUEMA_VERSAO, skill: 'mavik-create-motions', versao_skill: VERSAO, criado_em: hoje(), serie_ativa: serieAtiva, motor: 'remotion', caminhos: { marca: 'marca', series: 'series', motor: 'motor', referencias: 'referencias' } }));
  pl.arquivo(path.join(D, '.mavik/status.json'), json({ name: path.basename(D), summary: 'Estúdio de série de vídeos (mavik-create-motions)', stage: 'ideia', production: false, phases: [{ name: 'Configuração', goal: 'Marca e série definidas', tasks: [{ text: 'Entrevista da marca', done: false }, { text: 'Entrevista da série', done: false }] }, { name: 'Episódios', goal: 'Produzir e publicar', tasks: [] }], nextStep: 'Entrevista da marca', ideas: [], blockers: [], sourceFiles: [] }));
  pl.arquivo(path.join(D, '.gitignore'), 'node_modules/\nmotor/node_modules/\n**/render/\n*.wav\n.env\n.env.*\n');
  pl.bloco(path.join(D, 'CLAUDE.md'), blocoInstrucoes());
  pl.bloco(path.join(D, 'AGENTS.md'), blocoInstrucoes());
  return { pasta: D, executado: !!yes, passos: aplicar(pl, yes) };
}

function formatoDir(formato) {
  const F = path.join(RAIZ_SKILL, 'formatos', formato);
  if (!existsSync(path.join(F, 'formato.json'))) throw new ErroDados(`formato desconhecido: ${formato} (veja a pasta formatos/)`);
  return F;
}
export function cmdSerie({ dir, nome, formato = 'motion-interface', yes }) {
  if (!dir || !nome) throw new ErroUso('--dir e --nome são obrigatórios');
  if (!slugOk(nome)) throw new ErroUso('--nome em minúsculas com hífen (ex.: noticias-ia)');
  const D = path.resolve(dir);
  if (!existsSync(path.join(D, 'estudio.json'))) throw new ErroDados('pasta sem estudio.json: rode init primeiro');
  const F = formatoDir(formato);
  const fmt = lerJson(path.join(F, 'formato.json'));
  const SD = path.join(D, 'series', nome);
  const pl = plano();
  pl.pasta(path.join(SD, 'episodios'));
  pl.arquivo(path.join(SD, 'serie.json'), json({ esquema: ESQUEMA_VERSAO, confirmado: false, nome, linha_editorial: '', publico: '', formato, duracao_segundos: fmt.duracao_padrao || '', voz: { provedor: '', id: '', plano: '' }, trilha: { direcao: fmt.trilha_padrao || '', direitos: '' }, cta: { texto: '', destino: '' }, frases_proibidas: [], cadencia: '' }));
  pl.copia(path.join(F, 'biblia.md'), path.join(SD, 'biblia.md'));
  pl.arquivo(path.join(SD, 'erros-corrigidos.md'), '# Erros corrigidos\n\nCada correção da pessoa vira uma linha. Formato: `AAAA-MM-DD · o que estava errado → a regra agora · frase da pessoa`.\n\n');
  pl.arquivo(path.join(SD, 'pauta.md'), '# Pauta\n\n| Data | Assunto | Fonte oficial | Selo | Status |\n|---|---|---|---|---|\n');
  const est = path.join(D, 'estudio.json');
  const e = lerJson(est);
  if (!e.serie_ativa) pl.estado(est, json({ ...e, serie_ativa: nome }));
  return { serie: nome, executado: !!yes, passos: aplicar(pl, yes) };
}

function serieDe(D, serie) {
  const s = serie || lerJson(path.join(D, 'estudio.json')).serie_ativa;
  if (!s) throw new ErroDados('nenhuma série ativa: rode "serie" primeiro ou passe --serie');
  const SD = path.join(D, 'series', s);
  if (!existsSync(SD)) throw new ErroDados(`série não existe: ${s}`);
  return { s, SD };
}
export function cmdEpisodio({ dir, serie, nome, yes }) {
  if (!dir || !nome) throw new ErroUso('--dir e --nome são obrigatórios');
  if (!slugOk(nome)) throw new ErroUso('--nome em minúsculas com hífen');
  const D = path.resolve(dir);
  const { s, SD } = serieDe(D, serie);
  const ED = path.join(SD, 'episodios');
  const nums = existsSync(ED) ? readdirSync(ED).map((x) => parseInt(x, 10)).filter((n) => n > 0) : [];
  const id = `${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}-${nome}`;
  const P = path.join(ED, id);
  const pl = plano();
  for (const p of ['', 'voz', 'render', 'final']) pl.pasta(path.join(P, p));
  pl.arquivo(path.join(P, 'estado.json'), json({ esquema: ESQUEMA_VERSAO, episodio: id, serie: s, criado_em: hoje(), etapa: 'pauta', aprovacoes: [], historico: [{ em: new Date().toISOString(), etapa: 'pauta' }] }));
  pl.arquivo(path.join(P, 'fontes.md'), '# Fontes e fatos\n\n| Afirmação | Fonte (link) | Data | Selo |\n|---|---|---|---|\n');
  pl.arquivo(path.join(P, 'roteiro.md'), '# Roteiro\n\n## Fala\n\n## Texto na tela\n\n## Legenda do post\n\n(lembrar: "narração gerada por IA" quando a voz for sintética)\n');
  return { episodio: id, executado: !!yes, passos: aplicar(pl, yes) };
}

function acharEpisodio(D, ep, serie) {
  const { SD } = serieDe(D, serie);
  const ED = path.join(SD, 'episodios');
  const alvo = readdirSync(ED).find((x) => x === ep || x.startsWith(ep + '-') || x.endsWith('-' + ep));
  if (!alvo) throw new ErroDados(`episódio não encontrado: ${ep}`);
  return path.join(ED, alvo, 'estado.json');
}
export function cmdAprovar({ dir, episodio, serie, etapa, por, frase }) {
  if (!dir || !episodio || !etapa || !por || !frase) throw new ErroUso('--dir, --episodio, --etapa, --por e --frase são obrigatórios');
  const f = acharEpisodio(path.resolve(dir), episodio, serie);
  const e = lerJson(f);
  e.aprovacoes.push({ etapa, por, frase, em: new Date().toISOString() });
  const erros = validarEstado(e);
  if (erros.length) throw new ErroDados(erros.join('; '));
  writeFileSync(f, json(e));
  return { episodio: e.episodio, aprovado: etapa };
}
const EXIGE = { voz: 'roteiro', render: 'piloto', publicado: 'final' };
export function cmdEtapa({ dir, episodio, serie, para }) {
  if (!dir || !episodio || !para) throw new ErroUso('--dir, --episodio e --para são obrigatórios');
  if (!ETAPAS.includes(para)) throw new ErroUso(`--para deve ser uma de: ${ETAPAS.join(', ')}`);
  const f = acharEpisodio(path.resolve(dir), episodio, serie);
  const e = lerJson(f);
  const precisa = Object.entries(EXIGE).filter(([alvo]) => ETAPAS.indexOf(para) >= ETAPAS.indexOf(alvo)).map(([, ap]) => ap);
  const faltam = precisa.filter((ap) => !e.aprovacoes.some((a) => a.etapa === ap));
  if (faltam.length) throw new ErroDados(`não dá para ir para "${para}" sem aprovação de: ${faltam.join(', ')}`);
  e.etapa = para; e.historico.push({ em: new Date().toISOString(), etapa: para });
  writeFileSync(f, json(e));
  return { episodio: e.episodio, etapa: para };
}

const PROXIMO = {
  pauta: 'Conferir os fatos na fonte oficial e preencher fontes.md com selos', fatos: 'Escrever o roteiro (fala e texto da tela) na linha editorial', roteiro: 'Mostrar o roteiro e pedir o ok (aprovar --etapa roteiro)',
  voz: 'Gerar a voz e salvar em voz/', tempos: 'Tirar o tempo de cada palavra (tempos.json)', cenas: 'Montar as cenas no motor e a folha de contato', piloto: 'Mostrar a folha de contato e pedir o ok (aprovar --etapa piloto)',
  render: 'Renderizar, mixar e conferir (QA)', final: 'Mostrar o MP4 e pedir o ok (aprovar --etapa final)', publicado: 'Rodar /aprender com o que a pessoa corrigiu',
};
export function cmdStatus({ dir }) {
  const D = path.resolve(dir || '.');
  if (!existsSync(path.join(D, 'estudio.json'))) return { pronto: false, proximo: 'Rodar init (setup do estúdio) nesta pasta', codigo: 4 };
  const est = lerJson(path.join(D, 'estudio.json'));
  const m = existsSync(path.join(D, 'marca/marca.json')) ? lerJson(path.join(D, 'marca/marca.json')) : {};
  const vm = validarMarca(m);
  const out = { pasta: D, serie_ativa: est.serie_ativa || null, marca: { pronta: vm.pronta, confirmada: m.confirmado === true, erros: vm.erros, falta: vm.falta }, serie: null, episodios: [] };
  if (!vm.pronta) { out.proximo = vm.falta.length ? `Entrevista da marca: ${vm.falta[0].pergunta}` : 'Mostrar a marca à pessoa e confirmar (marca.confirmado = true)'; out.codigo = 4; return out; }
  if (!est.serie_ativa) { out.proximo = 'Criar a série (estudio.mjs serie) e fazer a entrevista da série'; out.codigo = 4; return out; }
  const SD = path.join(D, 'series', est.serie_ativa);
  const s = lerJson(path.join(SD, 'serie.json'));
  const vs = validarSerie(s);
  out.serie = { nome: est.serie_ativa, pronta: vs.pronta, erros: vs.erros, falta: vs.falta, avisos: vs.avisos };
  if (!vs.pronta) { out.proximo = vs.falta.length ? `Entrevista da série: ${vs.falta[0].pergunta}` : 'Mostrar a série à pessoa e confirmar (serie.confirmado = true)'; out.codigo = 4; return out; }
  const ED = path.join(SD, 'episodios');
  for (const ep of existsSync(ED) ? readdirSync(ED).filter((x) => statSync(path.join(ED, x)).isDirectory()).sort() : []) {
    const f = path.join(ED, ep, 'estado.json');
    if (!existsSync(f)) continue;
    const e = lerJson(f);
    out.episodios.push({ episodio: ep, etapa: e.etapa, aprovacoes: e.aprovacoes.map((a) => a.etapa), proximo: PROXIMO[e.etapa] });
  }
  const aberto = out.episodios.find((e) => e.etapa !== 'publicado');
  out.proximo = aberto ? `${aberto.episodio}: ${aberto.proximo}` : 'Abrir o próximo episódio (estudio.mjs episodio --nome ...)';
  out.codigo = 0;
  return out;
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; } }
    else o._.push(a);
  }
  return o;
}
const CMDS = { init: cmdInit, serie: cmdSerie, episodio: cmdEpisodio, status: cmdStatus, aprovar: cmdAprovar, etapa: cmdEtapa };
function imprimir(cmd, r, emJson) {
  if (emJson) { console.log(JSON.stringify(r, null, 2)); return; }
  if (r.passos) {
    console.log(r.executado ? 'FEITO:' : 'PRÉVIA (nada foi gravado; rode de novo com --yes):');
    for (const p of r.passos) console.log(`  ${p.tipo === 'mantido' ? 'mantido ' : p.tipo.padEnd(8)} ${p.caminho}`);
  } else if (cmd === 'status') {
    console.log(`Marca: ${r.marca ? (r.marca.pronta ? 'pronta' : 'pendente') : '-'}  Série: ${r.serie ? `${r.serie.nome} (${r.serie.pronta ? 'pronta' : 'pendente'})` : '-'}`);
    for (const e of r.episodios || []) console.log(`  ${e.episodio}: ${e.etapa} (aprovado: ${e.aprovacoes.join(', ') || 'nada'})`);
    for (const a of r.serie?.avisos || []) console.log('AVISO: ' + a);
    console.log('Próximo passo: ' + r.proximo);
  } else console.log(JSON.stringify(r));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  try {
    if (!CMDS[cmd]) throw new ErroUso(`comando desconhecido: ${cmd || '(nenhum)'}. Use: ${Object.keys(CMDS).join(', ')}`);
    const r = CMDS[cmd](a);
    imprimir(cmd, r, a.json);
    process.exit(r.codigo || 0);
  } catch (e) {
    console.error(JSON.stringify({ erro: e.message, codigo: e.codigo || 3 }));
    process.exit(e.codigo || 3);
  }
}
