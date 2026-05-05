/**
 * Chat Participant @sistema
 *
 * Permite ao usuário criar e consultar a estrutura de documentação do sistema
 * diretamente no chat do VS Code usando linguagem natural.
 *
 * Exemplos de uso:
 *   @sistema crie o módulo de autenticação com funções de login, logout e refresh
 *   @sistema adicione uma função para exportar relatório em PDF no módulo financeiro
 *   @sistema quais funções existem no módulo auth?
 *   @sistema mostre o resumo do sistema
 */

import * as vscode from 'vscode';
import { FoamWorkspace } from '@foam/core';

// ── Tipos locais (espelham os do index.ts, mas sem import circular) ────────

const ITEM_TYPES = ['pagina', 'modulo', 'funcao', 'observacao', 'backlog', 'ideia'] as const;

type ItemType = (typeof ITEM_TYPES)[number];

interface ItemMeta {
  label: string;
  icon: string;
  description: string;
}

interface ChatOptions {
  typeMeta: Record<string, ItemMeta>;
  createNote: (type: string, hierarchy: string, description?: string) => Promise<void>;
}

// ── Estrutura de resposta esperada do LLM ─────────────────────────────────

interface CreateAction {
  acao: 'criar';
  itens: Array<{
    type: ItemType;
    hierarchy: string;
    descricao?: string;
  }>;
}

interface ListAction {
  acao: 'listar';
  filtro?: string;
}

interface StatusAction {
  acao: 'status';
}

type LLMAction = CreateAction | ListAction | StatusAction;

// ── Prompt do sistema ─────────────────────────────────────────────────────

function buildSystemPrompt(estrutura: string): string {
  return `Você é um assistente de documentação de software integrado ao Foam (VS Code).
Você ajuda a documentar sistemas usando uma estrutura hierárquica de notas Markdown.

## Tipos de itens disponíveis

| tipo | quando usar | exemplos de hierarquia |
|---|---|---|
| pagina | Tela ou rota da UI | pagina.dashboard, pagina.financeiro.extrato |
| modulo | Módulo, serviço ou domínio | modulo.auth, modulo.pagamentos |
| funcao | Feature, endpoint, regra de negócio | funcao.auth.login, funcao.pagamentos.processar |
| observacao | Nota técnica, limitação, comportamento inesperado | observacao.performance.n-plus-1 |
| backlog | Item a implementar, melhoria planejada | backlog.v2.exportar-pdf |
| ideia | Sugestão de melhoria sem compromisso | ideia.ux.modo-escuro |

## Convenções de hierarquia (OBRIGATÓRIO seguir)

- Use **pontos** para separar níveis: \`modulo.pagamentos.recorrencia\`
- Use **hífens** para separar palavras dentro de um segmento: \`validar-token\`
- Módulos ficam em 1–2 níveis: \`modulo.auth\`, \`modulo.pagamentos\`
- Funções **herdam o prefixo do módulo pai**: se existe \`modulo.auth\`, as funções são \`funcao.auth.login\`, \`funcao.auth.logout\`
- Páginas representam rotas: \`pagina.dashboard\`, \`pagina.admin.usuarios\`
- Não repita o tipo na hierarquia: \`funcao.auth.login\` (correto), **NÃO** \`funcao.funcao.auth.login\`
- Nomes em **minúsculas sem acentos**: \`validar-token\` (não \`Validar Token\` nem \`validarToken\`)
- Seja **específico mas conciso**: \`auth.login.validar-token\` em vez de \`autenticacao.fluxo-de-login.validacao-do-token-jwt\`

## Estrutura de arquivos gerada

\`sistema/{tipo}/{hierarquia}.md\`
Ex: \`sistema/funcao/auth.login.validar-token.md\`

## Estrutura atual do sistema (notas existentes)

${estrutura || '(nenhuma nota cadastrada ainda)'}

## Instruções de resposta

Responda SOMENTE com um bloco JSON válido, sem texto extra, sem markdown fences.

### Para criar itens:
\`\`\`
{"acao":"criar","itens":[{"type":"modulo","hierarchy":"auth","descricao":"Módulo de autenticação"},{"type":"funcao","hierarchy":"auth.login","descricao":"Login de usuário"}]}
\`\`\`

### Para listar/consultar:
\`\`\`
{"acao":"listar","filtro":"auth"}
\`\`\`

### Para resumo geral:
\`\`\`
{"acao":"status"}
\`\`\`

Seja criterioso: ao criar módulo + funções filhas, inclua AMBOS no array \`itens\`.
Se o módulo pai já existir na estrutura atual, não o recrie — apenas crie as funções filhas.
Se o usuário não especificar o tipo, infira pelo contexto:
- "módulo de pagamentos" → type: modulo
- "função de login" ou "endpoint de login" → type: funcao
- "tela de dashboard" ou "página de relatórios" → type: pagina
- "preciso implementar..." ou "falta fazer..." → type: backlog
- "observei que..." ou "atenção:" → type: observacao
`;
}

// ── Snapshot do workspace ─────────────────────────────────────────────────

function buildWorkspaceSnapshot(workspace: FoamWorkspace): string {
  const byType: Record<string, string[]> = {};

  for (const res of workspace.resources()) {
    const type = res.properties?.type as string | undefined;
    if (!type || !ITEM_TYPES.includes(type as ItemType)) continue;
    if (!byType[type]) byType[type] = [];
    byType[type].push(res.uri.getName());
  }

  if (Object.keys(byType).length === 0) return '';

  return Object.entries(byType)
    .map(([type, names]) => `- ${type}: ${names.sort().join(', ')}`)
    .join('\n');
}

// ── Parse da resposta do LLM ──────────────────────────────────────────────

function parseLLMResponse(raw: string): LLMAction | null {
  // Remove markdown fences se existirem
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.acao === 'string') {
      return parsed as LLMAction;
    }
  } catch {
    // tenta extrair JSON de dentro do texto
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as LLMAction;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ── Handler principal ─────────────────────────────────────────────────────

async function handleRequest(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  workspace: FoamWorkspace,
  options: ChatOptions
): Promise<vscode.ChatResult> {
  const { typeMeta, createNote } = options;

  // Seleciona modelo LM disponível
  const models = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4o',
  });

  if (!models.length) {
    stream.markdown(
      '❌ Nenhum modelo de linguagem disponível. Certifique-se de que o GitHub Copilot está ativo.'
    );
    return {};
  }

  const model = models[0];
  const estrutura = buildWorkspaceSnapshot(workspace);
  const systemPrompt = buildSystemPrompt(estrutura);

  stream.progress('Interpretando sua solicitação...');

  let raw = '';
  try {
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];
    const response = await model.sendRequest(messages, {}, token);
    for await (const chunk of response.text) {
      raw += chunk;
    }
  } catch (err) {
    if (err instanceof vscode.LanguageModelError) {
      stream.markdown(`❌ Erro no modelo: ${err.message}`);
    } else {
      stream.markdown('❌ Erro ao processar a solicitação.');
    }
    return {};
  }

  const action = parseLLMResponse(raw);

  if (!action) {
    stream.markdown(
      '❌ Não consegui interpretar a resposta. Tente reformular seu pedido.\n\n**Dica:** Seja específico, por exemplo:\n- "crie módulo de autenticação com funções login e logout"\n- "quais funções existem no módulo pagamentos?"'
    );
    return {};
  }

  // ── Ação: CRIAR ──────────────────────────────────────────────────────────
  if (action.acao === 'criar') {
    const itens = action.itens ?? [];
    if (!itens.length) {
      stream.markdown('Não identifiquei itens para criar. Seja mais específico.');
      return {};
    }

    stream.markdown(`### Criando ${itens.length} item(s)\n`);

    const criados: string[] = [];
    const erros: string[] = [];

    for (const item of itens) {
      if (!ITEM_TYPES.includes(item.type)) {
        erros.push(`Tipo inválido: \`${item.type}\``);
        continue;
      }
      if (!item.hierarchy || typeof item.hierarchy !== 'string') {
        erros.push(`Hierarquia inválida para tipo \`${item.type}\``);
        continue;
      }

      stream.progress(`Criando ${item.type}: ${item.hierarchy}...`);

      try {
        await createNote(item.type, item.hierarchy, item.descricao);
        const meta = typeMeta[item.type];
        const icon = meta?.icon ?? '$(file)';
        const label = meta?.label ?? item.type;
        criados.push(
          `${icon} **${label}** \`${item.hierarchy}\`${
            item.descricao ? ` — ${item.descricao}` : ''
          }`
        );
      } catch (e) {
        erros.push(`Falha ao criar \`${item.type}.${item.hierarchy}\`: ${String(e)}`);
      }
    }

    if (criados.length) {
      stream.markdown('**Criados:**\n' + criados.map(c => `- ${c}`).join('\n'));
    }
    if (erros.length) {
      stream.markdown('\n\n**Erros:**\n' + erros.map(e => `- ${e}`).join('\n'));
    }

    stream.markdown(
      `\n\n> Use \`foam-vscode.system-explorer.lookup\` ou o painel lateral para navegar pelos itens criados.`
    );
    return {};
  }

  // ── Ação: LISTAR ─────────────────────────────────────────────────────────
  if (action.acao === 'listar') {
    const filtro = (action as ListAction).filtro?.toLowerCase() ?? '';
    const byType: Record<string, Array<{ name: string; title?: string }>> = {};

    for (const res of workspace.resources()) {
      const type = res.properties?.type as string | undefined;
      if (!type || !ITEM_TYPES.includes(type as ItemType)) continue;
      const name = res.uri.getName();
      if (filtro && !name.toLowerCase().includes(filtro) && !type.includes(filtro)) continue;
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        name,
        title: res.properties?.title as string | undefined,
      });
    }

    if (!Object.keys(byType).length) {
      stream.markdown(
        filtro ? `Nenhum item encontrado para \`${filtro}\`.` : 'Nenhum item cadastrado ainda.'
      );
      return {};
    }

    stream.markdown(filtro ? `### Itens com "${filtro}"\n` : '### Estrutura do sistema\n');

    for (const [type, items] of Object.entries(byType).sort()) {
      const meta = typeMeta[type];
      const icon = meta?.icon ?? '';
      const label = meta?.label ?? type;
      stream.markdown(`\n**${icon} ${label}** (${items.length})\n`);
      for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
        const title = item.title ? ` — ${item.title}` : '';
        stream.markdown(`- \`${item.name}\`${title}\n`);
      }
    }

    return {};
  }

  // ── Ação: STATUS ─────────────────────────────────────────────────────────
  if (action.acao === 'status') {
    const counts: Record<string, number> = {};
    for (const res of workspace.resources()) {
      const type = res.properties?.type as string | undefined;
      if (!type || !ITEM_TYPES.includes(type as ItemType)) continue;
      counts[type] = (counts[type] ?? 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    stream.markdown('### Resumo do Sistema\n');
    if (!total) {
      stream.markdown('Nenhum item cadastrado ainda. Use `@sistema crie...` para começar.');
      return {};
    }

    stream.markdown(`**Total:** ${total} item(s)\n`);
    for (const type of ITEM_TYPES) {
      if (!counts[type]) continue;
      const meta = typeMeta[type];
      stream.markdown(`- ${meta?.icon ?? ''} **${meta?.label ?? type}**: ${counts[type]}\n`);
    }

    return {};
  }

  stream.markdown(
    'Não entendi a solicitação. Tente algo como:\n- "crie módulo de autenticação com login e logout"\n- "liste as funções do módulo pagamentos"\n- "status"'
  );
  return {};
}

// ── Exportação ────────────────────────────────────────────────────────────

export function registerSystemChatParticipant(
  context: vscode.ExtensionContext,
  workspace: FoamWorkspace,
  options: ChatOptions
): void {
  if (!vscode.chat?.createChatParticipant) {
    // Chat API não disponível nesta versão do VS Code
    return;
  }

  const participant = vscode.chat.createChatParticipant(
    'foam-vscode.sistema',
    (request, ctx, stream, token) => handleRequest(request, ctx, stream, token, workspace, options)
  );

  participant.iconPath = new vscode.ThemeIcon('symbol-namespace');

  context.subscriptions.push(participant);
}
