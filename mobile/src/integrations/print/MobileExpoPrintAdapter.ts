import { CupomImpressao, PrintResult } from '../../../../shared/ports';
import {
  ExtendedPrintPort,
  PrintOptions,
  DetailedPrintResult,
} from '../../../../shared/integrations/print/PrintPort';
import { formatarCupomHTML, formatarCupomTexto } from '../../../../shared/integrations/print/formatter';
import { ThermalSimulatorPrintAdapter } from '../../../../shared/integrations/print/ThermalSimulatorPrintAdapter';

export interface ExpoPrintModule {
  printAsync: (options: { html: string; printerUrl?: string }) => Promise<void>;
  printToFileAsync?: (options: { html: string }) => Promise<{ uri: string; numberOfPages: number }>;
}

export interface MobilePrintAdapterOptions {
  larguraColunas?: 32 | 40 | 48;
  expoPrintModule?: ExpoPrintModule;
  printerUrl?: string;
  fallbackSimulatorSeSemNativo?: boolean;
}

/**
 * Adaptador de impressão para Mobile (Expo / React Native).
 * Utiliza o módulo expo-print para renderizar o cupom térmico em HTML e disparar a impressão nativa.
 */
export class MobileExpoPrintAdapter implements ExtendedPrintPort {
  private options: MobilePrintAdapterOptions;
  private fallbackSimulator: ThermalSimulatorPrintAdapter;

  constructor(options: MobilePrintAdapterOptions = {}) {
    this.options = {
      larguraColunas: 48,
      fallbackSimulatorSeSemNativo: true,
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

    const expoPrint = this.obterExpoPrint();

    if (!expoPrint) {
      if (this.options.fallbackSimulatorSeSemNativo) {
        return this.fallbackSimulator.imprimirCupom(cupom, options);
      }
      return {
        sucesso: false,
        mensagem: 'Módulo expo-print não encontrado no runtime nativo.',
        timestamp,
        adaptadorUtilizado: 'MobileExpoPrintAdapter (sem expo-print)',
      };
    }

    try {
      await expoPrint.printAsync({
        html,
        printerUrl: this.options.printerUrl,
      });

      return {
        sucesso: true,
        mensagem: `Cupom da comanda ${cupom.comanda.codigo} enviado para impressão via Expo Print.`,
        timestamp,
        cupomFormatadoTexto: texto,
        viaAtual: 1,
        totalVias: options?.vias || 1,
        adaptadorUtilizado: 'MobileExpoPrintAdapter (expo-print)',
      };
    } catch (erro: any) {
      console.warn('[MobileExpoPrintAdapter] Falha na chamada nativa do expo-print:', erro);
      return {
        sucesso: false,
        mensagem: erro?.message || 'Falha ao executar impressão nativa no dispositivo.',
        timestamp,
        cupomFormatadoTexto: texto,
        adaptadorUtilizado: 'MobileExpoPrintAdapter (error)',
      };
    }
  }

  public async verificarStatus(): Promise<{ online: boolean; pronto: boolean; detalhes?: string }> {
    const temExpoPrint = !!this.obterExpoPrint();
    return {
      online: true,
      pronto: temExpoPrint || !!this.options.fallbackSimulatorSeSemNativo,
      detalhes: temExpoPrint
        ? 'Pronto para impressão nativa via expo-print.'
        : 'Operando em modo simulador (expo-print não injetado).',
    };
  }

  private obterExpoPrint(): ExpoPrintModule | null {
    if (this.options.expoPrintModule) {
      return this.options.expoPrintModule;
    }
    try {
      // Tentativa de import dinâmico em runtime React Native/Expo
      const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
      const expoPrintGlobal = (global as any)?.ExpoPrint || globalObj?.window?.ExpoPrint || globalObj?.ExpoPrint;
      if (expoPrintGlobal) return expoPrintGlobal;
      return null;
    } catch {
      return null;
    }
  }
}
