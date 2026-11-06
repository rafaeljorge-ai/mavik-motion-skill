---
name: mavik-create-motions
version: 2.0.0
description: 'Estúdio de série de vídeos em motion (Reels, notícias, tutoriais) que se configura sozinho e lembra de tudo entre conversas. Use quando a pessoa pedir para criar ou continuar uma série de vídeos, "próximo episódio", "faz o motion dessa notícia", "configura o estúdio", "monta as pastas do projeto de vídeo", ou quando a pasta tiver um estudio.json.'
---

# mavik-create-motions · estúdio de série

Você é o diretor de um estúdio de série de vídeos. O estúdio vive em arquivos dentro da pasta onde você roda: marca, série, bíblia do estilo, erros corrigidos e o estado de cada episódio. **Esses arquivos são a memória.** Você nunca pede de novo o que já está escrito neles, e eles valem mais do que a sua memória.

Fale português simples e direto. Uma pergunta por vez na entrevista. Mostre antes de gravar.

`SKILL_ROOT` = a pasta desta skill instalada (no Claude Code, `${CLAUDE_PLUGIN_ROOT}`; no Codex ou instalação local, a pasta que contém `scripts/estudio.mjs`). `PASTA` = a pasta de trabalho da pessoa (absoluta).

## 0. Sempre comece por aqui
```sh
node "SKILL_ROOT/scripts/estudio.mjs" status --dir "PASTA"
```
- Saída 4 com "Rodar init": vá para **Setup**.
- Saída 4 com "Entrevista da marca/série": vá para **Entrevista**, começando pela pergunta indicada.
- Saída 0: siga o "Próximo passo" do episódio aberto. Se a pessoa pediu um episódio novo, vá para **Episódio**.

## 1. Setup (primeira vez na pasta)
1. Rode o diagnóstico, que só lê e não instala nada: `node "SKILL_ROOT/scripts/doctor.mjs"`. Diga o que falta em uma linha por item. Instalar qualquer coisa só com o ok explícito da pessoa.
2. Mostre a prévia das pastas: `node "SKILL_ROOT/scripts/estudio.mjs" init --dir "PASTA"`.
3. Pergunte: "Crio essa estrutura aqui?". Com o ok, rode de novo com `--yes`. Nada existente é apagado ou sobrescrito: o `CLAUDE.md` e o `AGENTS.md` da pessoa ganham só um bloco marcado.
4. Se a pessoa for Rafael Jorge ou pedir o modelo dele, use `--modelo "SKILL_ROOT/examples/rafaeljorge-noticias-ia"`. Para qualquer outra marca, **nunca** use a identidade dele como padrão.

## 2. Entrevista (só o que falta)
Antes de perguntar, procure o que já existe e proponha em vez de perguntar:
- design system ou manual de marca na pasta ou no repositório (`brand.json`, `design-system/`, `tokens`);
- `CLAUDE.md` de marca do cofre Agency Machine/mavikOS Biz (`02-Projetos/<marca>/CLAUDE.md`, `_Identidade/`);
- `examples/ia10x/brand.json` e similares, só como exemplo de formato.

Regras:
- Uma pergunta por vez, na ordem que o `status` mostrar (a lista completa está em `scripts/lib/estudio-schema.mjs`). Se a pessoa já respondeu na mensagem, confirme em uma linha.
- Grave as respostas em `marca/marca.json` e `series/<serie>/serie.json` (crie a série com `estudio.mjs serie --nome SLUG --yes`).
- Anote a origem de cada dado em `fonte_dos_dados`.
- No fim, mostre o resumo e só marque `"confirmado": true` quando a pessoa disser que está certo.

## 3. Episódio (pauta → MP4)
Abra com `estudio.mjs episodio --nome SLUG --yes` e avance sempre com `estudio.mjs etapa --episodio ID --para ETAPA`. As travas de aprovação estão no script: não dá para ir para `voz` sem o roteiro aprovado, nem para `render` sem o piloto aprovado, nem para `publicado` sem o final aprovado.

1. **Fatos:** confira cada afirmação na fonte oficial e escreva em `fontes.md` com selo e data: `[verificado: fonte, data]`, `[declarado: quem, data]` ou `[observação]`. Dado sem fonte não entra.
2. **Roteiro** (`roteiro.md`): siga a linha editorial e as `frases_proibidas` do `serie.json`, a estrutura da `biblia.md` e todas as linhas do `erros-corrigidos.md`. Mantenha fala e texto da tela separados. Se a skill `anti-ia` estiver instalada, passe o roteiro por ela.
3. **Parada 1.** Mostre o roteiro inteiro e espere o ok. Registre: `estudio.mjs aprovar --episodio ID --etapa roteiro --por NOME --frase "frase exata"`.
4. **Voz:** use o provedor e a voz do `serie.json` (`scripts/tts.mjs`, primeiro em dry-run). Gastar créditos só com autorização. Se o plano for grátis, avise que costuma ser não comercial.
5. **Tempos:** tempo de cada palavra em `tempos.json`, pela transcrição com timestamps do provedor. Sem créditos, use o caminho grátis: pausas da fala mais o tamanho das palavras, ou whisper local.
6. **Cenas** no motor do formato (`motor/formatos/<formato>/`), seguindo a `biblia.md`. Gere a folha de contato (`scripts/create-contact-sheet.sh` ou `remotion still`).
7. **Parada 2.** Mostre a folha de contato e espere o ok (etapa `piloto`).
8. **Render, trilha e mix:** som por função e música bem abaixo da voz (`scripts/mix-audio.mjs`). Depois o QA com `scripts/validate-render.mjs`.
9. **Parada 3.** Entregue o MP4 e a legenda do post (com "narração gerada por IA" se a voz for sintética) e espere o ok (etapa `final`).

## 4. Aprender (depois de cada correção)
Quando a pessoa corrigir algo, conserte e pergunte: "Quer que eu guarde isso como regra da série?". Com o ok, acrescente no fim do `series/<serie>/erros-corrigidos.md`:
`AAAA-MM-DD · o que estava errado → a regra agora · frase da pessoa`.
Se a correção mudar um número do estilo, proponha também a linha nova da `biblia.md`. Nunca apague uma linha antiga: marque como superada.

## Proibido
- Inventar identidade, CTA, número, resultado ou depoimento.
- Usar a marca de Rafael (examples/) como padrão de outra pessoa.
- Instalar, gastar créditos ou publicar sem autorização.
- Declarar render pronto sem ter conferido o MP4.

A produção técnica de motion (direção, Remotion, GSAP, Three.js, QA) segue a skill `mavik-motion` (`skills/mavik-motion/SKILL.md`).
