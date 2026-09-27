import { CupomImpressao } from '../../../../shared/ports';
import {
  ExtendedPrintPort,
  PrintOptions,
  DetailedPrintResult,
} from '../../../../shared/integrations/print/PrintPort';
import { formatarCupomHTML, formatarCupomTexto } from '../../../../shared/integrations/print/formatter';
import { ThermalSimulatorPrintAdapter } from '../../../../shared/integrations/print/ThermalSimulatorPrintAdapter';

export interface WebPrintAdapterOptions {
  larguraColunas?: 32 | 40 | 48;
  autoFecharAposImpressao?: boolean;
  timeoutMs?: number;
  fallbackSimulatorSeSemDOM?: boolean;
}

/**
 * Adaptador de impressão para Web (Next.js / Navegador).
 * Cria um iframe isolado com estilos para bobina térmica (80mm/58mm) e dispara window.print().
 */
export class WebWindowPrintAdapter implements ExtendedPrintPort {
  private fallbackSimulator: ThermalSimulatorPrintAdapter;
  private options: WebPrintAdapterOptions;

  constructor(options: WebPrintAdapterOptions = {}) {
    this.options = {
      larguraColunas: 48,
      autoFecharAposImpressao: true,
      timeoutMs: 15000,
      fallbackSimulatorSeSemDOM: true,
      ...options,
    };
    this.fallbackSimulator = new ThermalSimulatorPrintAdapter({
      larguraPadrao: this.options.larguraColunas,
      logToConsole: false,
    });
  }

  public async imprimirCupom(
    cupom: CupomImpressao,
    options?: PrintOptions
  ): Promise<DetailedPrintResult> {
    const timestamp = new Date().toISOString();
    const largura = options?.larguraColunas || this.options.larguraColunas || 48;
    const html = formatarCupomHTML(cupom, { ...options, larguraColunas: largura });
    const texto = formatarCupomTexto(cupom, { ...options, larguraColunas: largura });

    // Se estiver em ambiente Node/SSR (sem window ou document), usa o simulador
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      if (this.options.fallbackSimulatorSeSemDOM) {
        return this.fallbackSimulator.imprimirCupom(cupom, options);
      }
      return {
        sucesso: false,
        mensagem: 'Ambiente sem suporte a DOM / window.print() (SSR ou Node runtime).',
        timestamp,
        adaptadorUtilizado: 'WebWindowPrintAdapter (SSR fallback)',
      };
    }

    try {
      await this.executarImpressaoViaIframe(html);
      return {
        sucesso: true,
        mensagem: `Impressão enviada para a fila do navegador (Comanda ${cupom.comanda.codigo}).`,
        timestamp,
        cupomFormatadoTexto: texto,
        viaAtual: 1,
        totalVias: options?.vias || 1,
        adaptadorUtilizado: 'WebWindowPrintAdapter',
      };
    } catch (erro: any) {
      console.warn('[WebWindowPrintAdapter] Falha ao imprimir via iframe, tentando simulador:', erro);
      return {
        sucesso: false,
        mensagem: erro?.message || 'Falha ao executar window.print() no navegador.',
        timestamp,
        cupomFormatadoTexto: texto,
        adaptadorUtilizado: 'WebWindowPrintAdapter (error)',
      };
    }
  }

  public async verificarStatus(): Promise<{ online: boolean; pronto: boolean; detalhes?: string }> {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    return {
      online: isBrowser,
      pronto: isBrowser,
      detalhes: isBrowser
        ? 'Pronto para impressão via diálogo do navegador.'
        : 'Executando em ambiente sem DOM (SSR / Node).',
    };
  }

  private executarImpressaoViaIframe(htmlContent: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      let limpo = false;
      const timeoutId = setTimeout(() => {
        limpar();
        reject(new Error('Tempo limite de impressão excedido.'));
      }, this.options.timeoutMs || 15000);

      const limpar = () => {
        if (limpo) return;
        limpo = true;
        clearTimeout(timeoutId);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        limpar();
        return reject(new Error('Não foi possível acessar o documento do iframe de impressão.'));
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            limpar();
            resolve();
          }, 1000);
        } catch (err) {
          limpar();
          reject(err);
        }
      };
    });
  }
}
