import * as vscode from 'vscode';
import { Foam } from '@foam/core';
import { SystemExplorerProvider } from './system-explorer-provider';
import { registerSystemChatParticipant } from './system-explorer-chat';
import { commands } from 'vscode';
import { URI } from '@foam/core';

export const SYSTEM_ITEM_TYPES = [
  'pagina',
  'modulo',
  'funcao',
  'observacao',
  'backlog',
  'ideia',
] as const;

export type SystemItemType = (typeof SYSTEM_ITEM_TYPES)[number];

export const SYSTEM_TYPE_META: Record<
  SystemItemType,
  { label: string; icon: string; description: string }
> = {
  pagina: {
    label: 'Página',
    icon: '$(browser)',
    description: 'Tela ou página do sistema',
  },
  modulo: {
    label: 'Módulo',
    icon: '$(package)',
    description: 'Módulo ou componente do sistema',
  },
  funcao: {
    label: 'Função',
    icon: '$(symbol-method)',
    description: 'Função ou feature do sistema',
  },
  observacao: {
    label: 'Observação',
    icon: '$(comment)',
    description: 'Nota técnica ou observação',
  },
  backlog: {
    label: 'Backlog',
    icon: '$(tasklist)',
    description: 'Item a implementar ou pendência',
  },
  ideia: {
    label: 'Ideia',
    icon: '$(lightbulb)',
    description: 'Ideia ou sugestão de melhoria',
  },
};

// ── Schema: campos obrigatórios por tipo ──────────────────────────────────

export const SYSTEM_SCHEMAS: Record<SystemItemType, { required: string[] }> = {
  pagina: { required: ['title', 'type', 'status'] },
  modulo: { required: ['title', 'type', 'status'] },
  funcao: { required: ['title', 'type', 'status'] },
  observacao: { required: ['title', 'type'] },
  backlog: { required: ['title', 'type', 'status'] },
  ideia: { required: ['title', 'type'] },
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Converte segmento de hierarquia para título legível: "validar-token" → "Validar Token" */
function segmentToTitle(segment: string): string {
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Converte hierarquia de pontos para slug de arquivo: "auth.login" → "auth.login" */
function hierarchyToSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-]/g, '');
}

/** Extrai o título do último segmento da hierarquia: "auth.login.validar-token" → "Validar Token" */
function hierarchyToDisplayTitle(hierarchy: string): string {
  const last = hierarchy.split('.').pop() ?? hierarchy;
  return segmentToTitle(last);
}

/** Parseia front matter de um documento de texto (retorna campos de nível raiz) */
function parseFrontMatter(text: string): Record<string, string> | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

// ── Activate ──────────────────────────────────────────────────────────────

export default async function activate(
  context: vscode.ExtensionContext,
  foamPromise: Promise<Foam>
) {
  const foam = await foamPromise;

  const provider = new SystemExplorerProvider(foam.workspace);

  const treeView = vscode.window.createTreeView('foam-vscode.system-explorer', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  // ── Schema diagnostics ──────────────────────────────────────────────────
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('foam-system-schema');

  function validateDoc(doc: vscode.TextDocument) {
    if (!doc.fileName.endsWith('.md')) {
      diagnosticCollection.delete(doc.uri);
      return;
    }
    const fm = parseFrontMatter(doc.getText());
    if (!fm) {
      diagnosticCollection.delete(doc.uri);
      return;
    }
    const type = fm.type as SystemItemType | undefined;
    if (!type || !SYSTEM_ITEM_TYPES.includes(type)) {
      diagnosticCollection.delete(doc.uri);
      return;
    }
    const schema = SYSTEM_SCHEMAS[type];
    const diags: vscode.Diagnostic[] = schema.required
      .filter(field => !fm[field] || fm[field] === '')
      .map(field => {
        const d = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 3),
          `Campo obrigatório ausente: '${field}' (${SYSTEM_TYPE_META[type].label})`,
          vscode.DiagnosticSeverity.Warning
        );
        d.source = 'Foam Sistema';
        return d;
      });
    diagnosticCollection.set(doc.uri, diags);
  }

  context.subscriptions.push(
    treeView,
    provider,
    diagnosticCollection,
    foam.workspace.onDidAdd(() => provider.refresh()),
    foam.workspace.onDidUpdate(() => provider.refresh()),
    foam.workspace.onDidDelete(() => provider.refresh()),
    vscode.workspace.onDidOpenTextDocument(validateDoc),
    vscode.workspace.onDidSaveTextDocument(validateDoc)
  );

  // Valida docs já abertos
  vscode.workspace.textDocuments.forEach(validateDoc);

  // ── Criar item (hierarquia por ponto, estilo Dendron) ───────────────────
  context.subscriptions.push(
    commands.registerCommand(
      'foam-vscode.system-explorer.create-item',
      async (type?: SystemItemType, prefill?: string) => {
        const selectedType = type ?? (await pickSystemType());
        if (!selectedType) return;

        const meta = SYSTEM_TYPE_META[selectedType];
        const hierarchy = await vscode.window.showInputBox({
          prompt: `Caminho hierárquico da ${meta.label} (use pontos para hierarquia)`,
          placeHolder: `Ex: ${getHierarchyPlaceholder(selectedType)}`,
          value: prefill,
        });
        if (!hierarchy) return;

        await createSystemNote(selectedType, hierarchy);
      }
    )
  );

  // ── Lookup command (estilo Dendron) ─────────────────────────────────────
  context.subscriptions.push(
    commands.registerCommand('foam-vscode.system-explorer.lookup', () => {
      const allItems: Array<{
        label: string;
        description: string;
        detail?: string;
        resource?: { uri: URI };
        create?: string;
        createType?: SystemItemType;
      }> = [];

      for (const res of foam.workspace.resources()) {
        const type = res.properties?.type as string | undefined;
        if (!type || !SYSTEM_ITEM_TYPES.includes(type as SystemItemType)) continue;
        const t = type as SystemItemType;
        const name = res.uri.getName();
        const title =
          (res.properties?.title as string) ?? segmentToTitle(name.split('.').pop() ?? name);
        const status = (res.properties?.status as string) ?? '';
        allItems.push({
          label: `${SYSTEM_TYPE_META[t].icon} ${t}.${name}`,
          description: title,
          detail: status ? `Status: ${status}` : undefined,
          resource: res,
        });
      }

      const qp = vscode.window.createQuickPick<(typeof allItems)[0]>();
      qp.items = allItems;
      qp.placeholder = 'funcao.auth.login  |  modulo.pagamentos  |  pagina.dashboard';
      qp.title = 'Sistema Lookup';
      qp.matchOnDescription = true;

      qp.onDidChangeValue(value => {
        const filtered = allItems.filter(
          i =>
            i.label.toLowerCase().includes(value.toLowerCase()) ||
            (i.description ?? '').toLowerCase().includes(value.toLowerCase())
        );
        if (value.trim()) {
          const createEntry = {
            label: `$(add) Criar: ${value}`,
            description: 'Novo item do sistema',
            create: value,
          };
          qp.items = [...filtered, createEntry];
        } else {
          qp.items = filtered;
        }
      });

      qp.onDidAccept(async () => {
        const sel = qp.selectedItems[0];
        qp.dispose();
        if (!sel) return;

        if (sel.resource) {
          const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.parse(sel.resource.uri.toString())
          );
          await vscode.window.showTextDocument(doc);
          return;
        }

        if (sel.create) {
          // Tenta extrair tipo do primeiro segmento: "funcao.auth.login"
          const parts = sel.create.split('.');
          let resolvedType: SystemItemType | undefined;
          let resolvedHierarchy: string;

          if (parts.length > 1 && SYSTEM_ITEM_TYPES.includes(parts[0] as SystemItemType)) {
            resolvedType = parts[0] as SystemItemType;
            resolvedHierarchy = parts.slice(1).join('.');
          } else {
            resolvedType = await pickSystemType();
            resolvedHierarchy = sel.create;
          }

          if (!resolvedType || !resolvedHierarchy) return;
          await createSystemNote(resolvedType, resolvedHierarchy);
        }
      });

      qp.show();
    })
  );

  // ── Atalhos rápidos por tipo ────────────────────────────────────────────
  for (const type of SYSTEM_ITEM_TYPES) {
    context.subscriptions.push(
      commands.registerCommand(`foam-vscode.system-explorer.create-${type}`, () =>
        commands.executeCommand('foam-vscode.system-explorer.create-item', type)
      )
    );
  }
  // ── Chat participant @sistema ───────────────────────────────────────────
  registerSystemChatParticipant(context, foam.workspace, {
    typeMeta: SYSTEM_TYPE_META,
    createNote: createSystemNote,
  });
}

// ── Funções auxiliares fora do activate ───────────────────────────────────

async function createSystemNote(
  type: SystemItemType,
  hierarchy: string,
  _description?: string
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage('Nenhum workspace aberto.');
    return;
  }

  const slug = hierarchyToSlug(hierarchy);
  if (!slug) {
    vscode.window.showErrorMessage('Caminho hierárquico inválido.');
    return;
  }

  const folder = workspaceFolders[0].uri;
  const fileUri = URI.joinPath(folder, 'sistema', type, `${slug}.md`);
  const title = hierarchyToDisplayTitle(hierarchy);
  const content = buildTemplate(type, title, hierarchy);

  const wsEdit = new vscode.WorkspaceEdit();
  wsEdit.createFile(vscode.Uri.parse(fileUri.toString()), {
    ignoreIfExists: false,
    overwrite: false,
  });
  wsEdit.insert(vscode.Uri.parse(fileUri.toString()), new vscode.Position(0, 0), content);

  await vscode.workspace.applyEdit(wsEdit);
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(fileUri.toString()));
  await vscode.window.showTextDocument(doc);
}

async function pickSystemType(): Promise<SystemItemType | undefined> {
  const items = SYSTEM_ITEM_TYPES.map(type => ({
    label: `${SYSTEM_TYPE_META[type].icon} ${SYSTEM_TYPE_META[type].label}`,
    description: SYSTEM_TYPE_META[type].description,
    value: type,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Tipo de Item do Sistema',
    placeHolder: 'Escolha o tipo de item a criar',
  });

  return picked?.value as SystemItemType | undefined;
}

function getHierarchyPlaceholder(type: SystemItemType): string {
  const examples: Record<SystemItemType, string> = {
    pagina: 'financeiro.relatorios.dashboard',
    modulo: 'auth.login',
    funcao: 'auth.login.validar-token',
    observacao: 'performance.consulta-lenta',
    backlog: 'v2.exportar-pdf',
    ideia: 'notificacoes.push',
  };
  return examples[type];
}

function buildTemplate(type: SystemItemType, title: string, hierarchy?: string): string {
  const now = new Date().toISOString().split('T')[0];
  const meta = SYSTEM_TYPE_META[type];

  const typeSpecific: Record<SystemItemType, string> = {
    pagina: `## Descrição\n\n<!-- Descreva o objetivo desta página -->\n\n## Componentes\n\n- \n\n## Regras de Negócio\n\n- \n\n## Observações\n\n- `,
    modulo: `## Descrição\n\n<!-- Descreva o objetivo deste módulo -->\n\n## Responsabilidades\n\n- \n\n## Dependências\n\n- \n\n## API / Interface\n\n\`\`\`\n\n\`\`\`\n\n## Observações\n\n- `,
    funcao: `## Descrição\n\n<!-- Descreva o que esta função faz -->\n\n## Entrada\n\n| Parâmetro | Tipo | Descrição |\n|---|---|---|\n| | | |\n\n## Saída\n\n<!-- Descreva o retorno -->\n\n## Regras\n\n- \n\n## Status\n\n- [ ] Em desenvolvimento\n- [ ] Testada\n- [ ] Documentada`,
    observacao: `## Contexto\n\n<!-- Onde e quando foi observado -->\n\n## Descrição\n\n<!-- Detalhe a observação -->\n\n## Impacto\n\n<!-- Alto / Médio / Baixo -->\n\n## Ação Necessária\n\n- `,
    backlog: `## Descrição\n\n<!-- O que precisa ser feito -->\n\n## Critérios de Aceitação\n\n- [ ] \n- [ ] \n\n## Prioridade\n\n<!-- Alta / Média / Baixa -->\n\n## Estimativa\n\n<!-- -->\n\n## Status\n\n- [ ] Pendente\n- [ ] Em desenvolvimento\n- [ ] Concluído`,
    ideia: `## Descrição\n\n<!-- Descreva a ideia -->\n\n## Motivação\n\n<!-- Por que isso seria útil? -->\n\n## Viabilidade\n\n<!-- Alta / Média / Baixa -->\n\n## Próximos Passos\n\n- `,
  };

  const hierarchyLine = hierarchy ? `\nhierarquia: ${hierarchy}` : '';

  return `---
title: ${title}
type: ${type}
tipo: ${meta.label}
criado: ${now}
status: ativo${hierarchyLine}
tags:
  - sistema/${type}
---

# ${title}

${typeSpecific[type]}
`;
}
