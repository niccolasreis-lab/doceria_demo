import { CupomImpressao, PrintResult, PrintPort } from '../../ports';

export * from '../../ports';

export interface PrintOptions {
  larguraColunas?: 32 | 40 | 48;
  vias?: number;
  cortarPapel?: boolean;
  abrirGaveta?: boolean;
  silencioso?: boolean;
}

export interface DetailedPrintResult extends PrintResult {
  cupomFormatadoTexto?: string;
  viaAtual?: number;
  totalVias?: number;
  adaptadorUtilizado?: string;
}

export interface ExtendedPrintPort extends PrintPort {
  imprimirCupom(cupom: CupomImpressao, options?: PrintOptions): Promise<DetailedPrintResult>;
  verificarStatus?(): Promise<{ online: boolean; pronto: boolean; detalhes?: string }>;
}
