import * as vscode from 'vscode';
import { Foam } from '../../../core/model/foam';
import { CancellationError } from '@foam/core';
import { TaskDeduplicator } from '@foam/core';
import { FoamWorkspace } from '@foam/core';
import { FoamEmbeddings } from '../../../ai/model/embeddings';

export const BUILD_EMBEDDINGS_COMMAND = {
  command: 'foam-vscode.build-embeddings',
  title: 'Foam: Analisar Notas com IA',
};

export default async function activate(
  context: vscode.ExtensionContext,
  foamPromise: Promise<Foam>
) {
  const foam = await foamPromise;
  // Deduplicate concurrent executions
  const deduplicator = new TaskDeduplicator<'complete' | 'cancelled' | 'error'>();

  context.subscriptions.push(
    vscode.commands.registerCommand(BUILD_EMBEDDINGS_COMMAND.command, async () => {
      return await deduplicator.run(
        () => buildEmbeddings(foam.workspace, foam.embeddings),
        () => {
          vscode.window.showInformationMessage(
            'Análise de notas já em andamento - aguardando conclusão'
          );
        }
      );
    })
  );
}

async function buildEmbeddings(
  workspace: FoamWorkspace,
  embeddings: FoamEmbeddings
): Promise<'complete' | 'cancelled' | 'error'> {
  const notesCount = workspace.list().filter(r => r.type === 'note').length;

  if (notesCount === 0) {
    vscode.window.showInformationMessage('Nenhuma nota encontrada no workspace');
    return 'complete';
  }

  // Show progress notification
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Analisando notas',
      cancellable: true,
    },
    async (progress, token) => {
      try {
        await embeddings.update(progressInfo => {
          const title = progressInfo.context?.title || 'Processing...';
          const increment = (1 / progressInfo.total) * 100;
          progress.report({
            message: `${progressInfo.current}/${progressInfo.total} - ${title}`,
            increment: increment,
          });
        }, token);

        vscode.window.showInformationMessage(
          `✓ Analisadas ${embeddings.size()} de ${notesCount} notas`
        );
        return 'complete';
      } catch (error) {
        if (error instanceof CancellationError) {
          vscode.window.showInformationMessage(
            'Análise cancelada. Execute o comando novamente para continuar de onde parou.'
          );
          return 'cancelled';
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        vscode.window.showErrorMessage(`Falha ao analisar notas: ${errorMessage}`);
        return 'error';
      }
    }
  );
}
