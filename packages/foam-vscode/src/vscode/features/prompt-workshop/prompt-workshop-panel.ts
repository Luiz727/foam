import * as vscode from 'vscode';
import { Foam } from '../../../core/model/foam';
import { TextGenerationProvider } from '../../../ai/services/text-generation-provider';
import { buildPrompt } from './prompt-builder';

export class PromptWorkshopPanel {
  public static currentPanel: PromptWorkshopPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private foam: Foam,
    private provider: TextGenerationProvider
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getWebviewContent();

    this.panel.webview.onDidReceiveMessage(
      async (message: { command: string; text?: string; answer?: string; rawIntent?: string }) => {
        switch (message.command) {
          case 'generate':
            await this.handleGenerate(message.text ?? '');
            break;
          case 'refine':
            await this.handleGenerate(message.rawIntent ?? '', message.answer);
            break;
          case 'copy':
            await vscode.env.clipboard.writeText(message.text ?? '');
            vscode.window.showInformationMessage('Prompt copiado para a área de transferência.');
            break;
        }
      },
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    foam: Foam,
    provider: TextGenerationProvider
  ) {
    const column = vscode.ViewColumn.Beside;

    if (PromptWorkshopPanel.currentPanel) {
      PromptWorkshopPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'foam-prompt-workshop',
      'Prompt Workshop',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    PromptWorkshopPanel.currentPanel = new PromptWorkshopPanel(panel, foam, provider);
  }

  private async handleGenerate(rawIntent: string, clarification?: string): Promise<void> {
    if (!rawIntent.trim()) {
      return;
    }

    const inputForLLM = clarification
      ? `${rawIntent}\n\nEsclarecimento adicional: ${clarification}`
      : rawIntent;

    this.panel.webview.postMessage({ command: 'loading', loading: true });

    try {
      const result = await buildPrompt(inputForLLM, this.foam, this.provider);
      this.panel.webview.postMessage({
        command: 'result',
        result,
        rawIntent,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.panel.webview.postMessage({ command: 'error', message: msg });
    } finally {
      this.panel.webview.postMessage({ command: 'loading', loading: false });
    }
  }

  private getWebviewContent(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <title>Prompt Workshop</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      max-width: 800px;
    }
    h2 { margin-top: 0; }
    label { display: block; margin-bottom: 4px; font-weight: bold; }
    textarea, input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px;
      font-family: inherit;
      font-size: inherit;
      resize: vertical;
    }
    button {
      margin-top: 8px;
      padding: 6px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .section { margin-top: 20px; }
    .result-box {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .questions { margin-top: 12px; }
    .questions ul { padding-left: 20px; }
    .error { color: var(--vscode-errorForeground); margin-top: 8px; }
    .hidden { display: none; }
    #spinner { margin-top: 8px; font-style: italic; opacity: 0.7; }
  </style>
</head>
<body>
  <h2>$(wand) Prompt Workshop</h2>
  <p>Descreva o que você quer fazer e o Foam irá gerar um prompt otimizado para o GitHub Copilot.</p>

  <div>
    <label for="intent">Sua intenção:</label>
    <textarea id="intent" rows="4" placeholder="Ex: Quero criar um resumo da nota atual conectando as ideias das notas relacionadas sobre aprendizado..."></textarea>
    <button id="generateBtn" onclick="generate()">Gerar Prompt</button>
  </div>

  <div id="spinner" class="hidden">Gerando prompt...</div>
  <div id="error" class="error hidden"></div>

  <div id="resultSection" class="section hidden">
    <label>Prompt otimizado:</label>
    <div class="result-box" id="resultText"></div>
    <button onclick="copyResult()">Copiar Prompt</button>

    <div id="questionsSection" class="questions hidden">
      <label style="margin-top:16px;">Perguntas de esclarecimento:</label>
      <ul id="questionsList"></ul>
      <label for="answer">Sua resposta (opcional):</label>
      <input type="text" id="answer" placeholder="Responda para refinar o prompt...">
      <button onclick="refine()">Refinar com Resposta</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentRawIntent = '';

    function generate() {
      const intent = document.getElementById('intent').value.trim();
      if (!intent) return;
      currentRawIntent = intent;
      vscode.postMessage({ command: 'generate', text: intent });
    }

    function refine() {
      const answer = document.getElementById('answer').value.trim();
      vscode.postMessage({ command: 'refine', rawIntent: currentRawIntent, answer });
    }

    function copyResult() {
      const text = document.getElementById('resultText').textContent;
      vscode.postMessage({ command: 'copy', text });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.command) {
        case 'loading':
          document.getElementById('generateBtn').disabled = msg.loading;
          document.getElementById('spinner').classList.toggle('hidden', !msg.loading);
          document.getElementById('error').classList.add('hidden');
          if (msg.loading) {
            document.getElementById('resultSection').classList.add('hidden');
          }
          break;
        case 'result': {
          const r = msg.result;
          document.getElementById('resultText').textContent = r.optimized_prompt;
          document.getElementById('resultSection').classList.remove('hidden');

          const qSection = document.getElementById('questionsSection');
          if (r.clarifying_questions && r.clarifying_questions.length > 0) {
            const list = document.getElementById('questionsList');
            list.innerHTML = r.clarifying_questions
              .map(q => '<li>' + escapeHtml(q) + '</li>')
              .join('');
            qSection.classList.remove('hidden');
          } else {
            qSection.classList.add('hidden');
          }
          break;
        }
        case 'error':
          document.getElementById('error').textContent = 'Erro: ' + msg.message;
          document.getElementById('error').classList.remove('hidden');
          break;
      }
    });

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(text));
      return div.innerHTML;
    }

    document.getElementById('intent').addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        generate();
      }
    });
  </script>
</body>
</html>`;
  }

  public dispose() {
    PromptWorkshopPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
