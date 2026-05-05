import { EmbeddingProvider, EmbeddingProviderInfo } from '../../services/embedding-provider';
import { Logger } from '@foam/core';

/**
 * Valida que a URL do Ollama é segura (apenas localhost/127.0.0.1 ou URL explícita do usuário).
 * Lança erro se o protocolo não for http/https ou se o host não for local.
 */
export function validateOllamaUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`URL do serviço de IA inválida: "${rawUrl}" não é uma URL válida.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `URL do serviço de IA inválida: protocolo "${parsed.protocol}" não suportado. Use http:// ou https://.`
    );
  }

  const localHosts = ['localhost', '127.0.0.1', '::1'];
  if (!localHosts.includes(parsed.hostname)) {
    Logger.warn(
      `Ollama configurado com host remoto "${parsed.hostname}". Certifique-se de que é intencional.`
    );
  }
}

/**
 * Configuration for Ollama embedding provider
 */
export interface OllamaConfig {
  /** Base URL for Ollama API (default: http://localhost:11434) */
  url: string;
  /** Model name to use for embeddings (default: nomic-embed-text) */
  model: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
}

/**
 * Default configuration for Ollama
 */
export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  url: 'http://localhost:11434',
  model: 'nomic-embed-text',
  timeout: 30000,
};

/**
 * Embedding provider that uses Ollama for generating embeddings
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_OLLAMA_CONFIG, ...config };
    validateOllamaUrl(this.config.url);
  }

  /**
   * Generate an embedding for the given text
   */
  async embed(text: string): Promise<number[]> {
    // normalize text to suitable input (format and size)
    // TODO we should better handle long texts by chunking them and averaging embeddings
    const input = text.substring(0, 6000).normalize();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.url}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          input: [input],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no serviço de IA (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.embeddings == null) {
        throw new Error(`Resposta inválida do serviço de IA: ${JSON.stringify(data)}`);
      }
      return data.embeddings[0];
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            'O serviço de IA demorou muito para responder. Pode estar ocupado processando outra requisição.'
          );
        }
        if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            'Não foi possível conectar ao Ollama. Certifique-se de que o Ollama está instalado e rodando.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Check if Ollama is available and the model is accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try to reach the Ollama API
      const response = await fetch(`${this.config.url}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        Logger.warn(`Ollama API returned status ${response.status} when checking availability`);
        return false;
      }

      return true;
    } catch (error) {
      Logger.debug(
        `Ollama não disponível: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return false;
    }
  }

  /**
   * Get provider information including model details
   */
  getProviderInfo(): EmbeddingProviderInfo {
    return {
      name: 'Ollama',
      type: 'local',
      model: {
        name: this.config.model,
        // nomic-embed-text produces 768-dimensional embeddings
        dimensions: 768,
      },
      description: 'Provedor local de embeddings usando Ollama',
      endpoint: this.config.url,
      metadata: {
        timeout: this.config.timeout,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
}
