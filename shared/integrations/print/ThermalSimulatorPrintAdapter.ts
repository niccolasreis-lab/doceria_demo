import { CupomImpressao } from '../../ports';
import { ExtendedPrintPort, PrintOptions, DetailedPrintResult } from './PrintPort';
import { formatarCupomTexto, formatarCupomHTML } from './formatter';

export interface ThermalSimulatorConfig {
  larguraPadrao?: 32 | 40 | 48;
  logToConsole?: boolean;
  latenciaSimuladaMs?: number;
  simularFalha?: boolean;
  mensagemFalha?: string;
}

export interface HistoricoImpressaoItem {
  id: string;
  timestamp: string;
  cupom: CupomImpressao;
  textoFormatado: string;
  htmlFormatado: string;
  vias: number;
}

export class ThermalSimulatorPrintAdapter implements ExtendedPrintPort {
  private config: ThermalSimulatorConfig;
  private historico: HistoricoImpressaoItem[] = [];

  constructor(config: ThermalSimulatorConfig = {}) {
    this.config = {
      larguraPadrao: 48,
      logToConsole: true,
      latenciaSimuladaMs: 100,
      simularFalha: false,
      mensagemFalha: 'Falha simulada na impressora térmica.',
      ...config,
    };
  }

  public async imprimirCupom(
    cupom: CupomImpressao,
    options?: PrintOptions
  ): Promise<DetailedPrintResult> {
    const timestamp = new Date().toISOString();
    const vias = options?.vias || 1;

    // Simulação de latência de comunicação com a impressora
    if (this.config.latenciaSimuladaMs && this.config.latenciaSimuladaMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latenciaSimuladaMs));
    }

    // Verificação de falha simulada
    if (this.config.simularFalha) {
      return {
        sucesso: false,
        mensagem: this.config.mensagemFalha || 'Falha ao comunicar com impressora.',
        timestamp,
        adaptadorUtilizado: 'ThermalSimulatorPrintAdapter',
      };
    }

    const largura = options?.larguraColunas || this.config.larguraPadrao || 48;
    const textoFormatado = formatarCupomTexto(cupom, { ...options, larguraColunas: largura });
    const htmlFormatado = formatarCupomHTML(cupom, { ...options, larguraColunas: largura });

    // Salva no histórico em memória
    this.historico.push({
      id: `SIM-PRINT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      cupom,
      textoFormatado,
      htmlFormatado,
      vias,
    });

    // Exibe no console formatado se habilitado
    if (this.config.logToConsole && !options?.silencioso) {
      console.log('\n┌───────────────────────────────────────────────┐');
      console.log('│  [SIMULADOR DE IMPRESSORA TÉRMICA - ESC/POS] │');
      console.log('└───────────────────────────────────────────────┘');
      console.log(textoFormatado);
    }

    return {
      sucesso: true,
      mensagem: `Cupom da comanda ${cupom.comanda.codigo} impresso com sucesso (${vias} via(s)).`,
      timestamp,
      cupomFormatadoTexto: textoFormatado,
      viaAtual: vias,
      totalVias: vias,
      adaptadorUtilizado: 'ThermalSimulatorPrintAdapter',
    };
  }

  public async verificarStatus(): Promise<{ online: boolean; pronto: boolean; detalhes?: string }> {
    return {
      online: true,
      pronto: !this.config.simularFalha,
      detalhes: this.config.simularFalha
        ? this.config.mensagemFalha
        : 'Simulador térmico operacional.',
    };
  }

  public getHistorico(): HistoricoImpressaoItem[] {
    return [...this.historico];
  }

  public limparHistorico(): void {
    this.historico = [];
  }

  public setConfig(novaConfig: Partial<ThermalSimulatorConfig>): void {
    this.config = { ...this.config, ...novaConfig };
  }
}
