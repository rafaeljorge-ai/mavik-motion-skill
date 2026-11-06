import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { cmdInit, cmdSerie, cmdEpisodio, cmdStatus, cmdAprovar, cmdEtapa, escreverBloco } from '../scripts/estudio.mjs';
import { validarMarca, validarSerie } from '../scripts/lib/estudio-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = path.join(root, 'examples/rafaeljorge-noticias-ia');
const novaPasta = () => mkdtempSync(path.join(tmpdir(), 'estudio-'));
const ler = (f) => JSON.parse(readFileSync(f, 'utf8'));

test('init sem --yes é só prévia e não grava nada', () => {
  const d = novaPasta();
  const r = cmdInit({ dir: d });
  assert.equal(r.executado, false);
  assert.deepEqual(readdirSync(d), []);
  assert.ok(r.passos.some((p) => p.caminho.endsWith('estudio.json')));
});

test('init --yes cria a estrutura e o status pede a entrevista da marca', () => {
  const d = novaPasta();
  cmdInit({ dir: d, yes: true });
  for (const f of ['estudio.json', 'marca/marca.json', 'marca/voz-da-marca.md', '.mavik/status.json', 'CLAUDE.md', 'AGENTS.md', 'series', 'motor', 'referencias'])
    assert.ok(existsSync(path.join(d, f)), f);
  const s = cmdStatus({ dir: d });
  assert.equal(s.codigo, 4);
  assert.match(s.proximo, /Entrevista da marca/);
});

test('init nunca sobrescreve arquivo da pessoa e preserva o CLAUDE.md dela', () => {
  const d = novaPasta();
  writeFileSync(path.join(d, 'CLAUDE.md'), '# Minhas regras\nNão mexer.\n');
  writeFileSync(path.join(d, 'estudio.json'), '{"meu":true}\n');
  cmdInit({ dir: d, yes: true });
  assert.equal(readFileSync(path.join(d, 'estudio.json'), 'utf8'), '{"meu":true}\n');
  const c = readFileSync(path.join(d, 'CLAUDE.md'), 'utf8');
  assert.match(c, /# Minhas regras\nNão mexer\./);
  assert.match(c, /mavik-create-motions:inicio/);
  cmdInit({ dir: d, yes: true });
  assert.equal(readFileSync(path.join(d, 'CLAUDE.md'), 'utf8').split('mavik-create-motions:inicio').length, 2, 'bloco não duplica');
});

test('bloco marcado é trocado no lugar, sem mexer no resto', () => {
  const d = novaPasta(); const f = path.join(d, 'AGENTS.md');
  writeFileSync(f, 'antes\n<!-- mavik-create-motions:inicio -->\nvelho\n<!-- mavik-create-motions:fim -->\ndepois\n');
  escreverBloco(f, 'novo');
  assert.equal(readFileSync(f, 'utf8'), 'antes\n<!-- mavik-create-motions:inicio -->\nnovo\n<!-- mavik-create-motions:fim -->\ndepois\n');
});

test('modelo de Rafael deixa marca e série prontas e o status pede o 1º episódio', () => {
  const d = novaPasta();
  cmdInit({ dir: d, modelo: MODELO, yes: true });
  const s = cmdStatus({ dir: d });
  assert.equal(s.codigo, 0, JSON.stringify(s));
  assert.equal(s.serie_ativa, 'noticias-ia');
  assert.ok(s.serie.avisos.some((a) => /não comercial/.test(a)));
  assert.match(s.proximo, /Abrir o próximo episódio/);
  assert.match(readFileSync(path.join(d, 'series/noticias-ia/erros-corrigidos.md'), 'utf8'), /vender mais/);
});

test('série nova a partir do formato copia a bíblia e exige entrevista', () => {
  const d = novaPasta();
  cmdInit({ dir: d, yes: true });
  const m = ler(path.join(d, 'marca/marca.json'));
  Object.assign(m, { confirmado: true, nome: 'Clínica X', descricao: 'Estética em Campinas', handle: '@clinicax', cores: { fundo: '#000000', texto: '#ffffff', destaque: '#ff3366' }, fontes: { principal: 'Inter' }, tom: ['próxima'], proibido: ['milagre'], fonte_dos_dados: 'aprovado na conversa' });
  writeFileSync(path.join(d, 'marca/marca.json'), JSON.stringify(m));
  cmdSerie({ dir: d, nome: 'dicas-pele', yes: true });
  assert.match(readFileSync(path.join(d, 'series/dicas-pele/biblia.md'), 'utf8'), /Bíblia do estilo/);
  assert.equal(ler(path.join(d, 'estudio.json')).serie_ativa, 'dicas-pele');
  const s = cmdStatus({ dir: d });
  assert.equal(s.codigo, 4);
  assert.match(s.proximo, /Entrevista da série/);
});

test('episódios numeram em sequência e as travas de aprovação funcionam', () => {
  const d = novaPasta();
  cmdInit({ dir: d, modelo: MODELO, yes: true });
  const a = cmdEpisodio({ dir: d, nome: 'ia-indica-empresas', yes: true });
  const b = cmdEpisodio({ dir: d, nome: 'gif-de-produto', yes: true });
  assert.equal(a.episodio, '001-ia-indica-empresas');
  assert.equal(b.episodio, '002-gif-de-produto');
  assert.throws(() => cmdEtapa({ dir: d, episodio: '001', para: 'voz' }), /aprovação de: roteiro/);
  assert.throws(() => cmdAprovar({ dir: d, episodio: '001', etapa: 'roteiro', por: 'Rafael', frase: '' }), /obrigatórios/);
  cmdAprovar({ dir: d, episodio: '001', etapa: 'roteiro', por: 'Rafael', frase: 'Aprovado.' });
  cmdEtapa({ dir: d, episodio: '001', para: 'voz' });
  assert.throws(() => cmdEtapa({ dir: d, episodio: '001', para: 'render' }), /piloto/);
  const s = cmdStatus({ dir: d });
  assert.equal(s.episodios[0].etapa, 'voz');
  assert.match(s.proximo, /^001-ia-indica-empresas: Gerar a voz/);
});

test('validações: cor fora do hex, @ sem arroba e trilha com direito desconhecido', () => {
  const m = validarMarca({ cores: { fundo: 'preto' }, handle: 'rafael' });
  assert.ok(m.erros.some((e) => e.includes('hex')));
  assert.ok(m.erros.some((e) => e.includes('@')));
  const s = validarSerie({ trilha: { direitos: 'youtube' }, duracao_segundos: 999 });
  assert.ok(s.erros.some((e) => e.includes('direitos')));
  assert.ok(s.erros.some((e) => e.includes('duracao')));
});

test('CLI: comando errado sai 2, status sem estúdio sai 4', () => {
  const cli = path.join(root, 'scripts/estudio.mjs');
  const d = novaPasta();
  const rodar = (args) => { try { execFileSync('node', [cli, ...args], { stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
  assert.equal(rodar(['voar']), 2);
  assert.equal(rodar(['status', '--dir', d]), 4);
  assert.equal(rodar(['init', '--dir', d, '--yes']), 0);
});
