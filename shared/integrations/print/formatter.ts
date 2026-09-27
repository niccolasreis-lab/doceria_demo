import { CupomImpressao } from '../../ports';
import { PrintOptions } from './PrintPort';

/**
 * Formata valor em centavos para moeda brasileira (R$ 0,00).
 */
export function formatarCentavosBRL(centavos: number): string {
  const valor = (centavos / 100).toFixed(2);
  const [inteiro, decimal] = valor.split('.');
  const formatadoInteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formatadoInteiro},${decimal}`;
}

/**
 * Normaliza strings para impressão térmica ASCII pura ou com acentos suportados.
 */
function centralizarLinha(texto: string, largura: number): string {
  if (texto.length >= largura) return texto.slice(0, largura);
  const espacos = largura - texto.length;
  const esquerda = Math.floor(espacos / 2);
  const direita = espacos - esquerda;
  return ' '.repeat(esquerda) + texto + ' '.repeat(direita);
}

function alinharExtremos(esquerda: string, direita: string, largura: number): string {
  const espacoDisponivel = largura - esquerda.length - direita.length;
  if (espacoDisponivel <= 0) {
    const esquerdaTruncada = esquerda.slice(0, Math.max(1, largura - direita.length - 1));
    const espacos = Math.max(1, largura - esquerdaTruncada.length - direita.length);
    return esquerdaTruncada + ' '.repeat(espacos) + direita;
  }
  return esquerda + ' '.repeat(espacoDisponivel) + direita;
}

/**
 * Gera o texto formatado para impressora térmica (ex: 48 colunas para 80mm ou 32/40 para 58mm).
 */
export function formatarCupomTexto(cupom: CupomImpressao, options?: PrintOptions): string {
  const largura = options?.larguraColunas || 48;
  const divisorSimples = '-'.repeat(largura);
  const divisorDuplo = '='.repeat(largura);

  const linhas: string[] = [];

  // Cabeçalho da Empresa
  linhas.push(divisorDuplo);
  linhas.push(centralizarLinha(cupom.empresa.nome.toUpperCase(), largura));
  if (cupom.empresa.cnpj) {
    linhas.push(centralizarLinha(`CNPJ: ${cupom.empresa.cnpj}`, largura));
  }
  if (cupom.empresa.endereco) {
    linhas.push(centralizarLinha(cupom.empresa.endereco, largura));
  }
  if (cupom.empresa.telefone) {
    linhas.push(centralizarLinha(`Tel: ${cupom.empresa.telefone}`, largura));
  }
  linhas.push(divisorDuplo);

  // Identificação do Documento Não-Fiscal
  linhas.push(centralizarLinha('*** DOCUMENTO NAO FISCAL ***', largura));
  linhas.push(centralizarLinha('EXTRATO DE CONFERENCIA DE CONTA', largura));
  linhas.push(divisorSimples);

  // Informações da Comanda e Mesa
  linhas.push(alinharExtremos(`COMANDA: ${cupom.comanda.codigo}`, `MESA: ${cupom.comanda.mesa}`, largura));
  linhas.push(alinharExtremos(`ATENDENTE: ${cupom.comanda.atendente}`, '', largura).trimEnd());
  linhas.push(alinharExtremos(`ABERTURA: ${new Date(cupom.comanda.abertaEm).toLocaleString('pt-BR')}`, '', largura).trimEnd());
  linhas.push(alinharExtremos(`FECHAMENTO: ${new Date(cupom.comanda.fechadaEm).toLocaleString('pt-BR')}`, '', largura).trimEnd());
  linhas.push(divisorSimples);

  // Cabeçalho dos Itens
  linhas.push(alinharExtremos('ITEM / QTD x UN', 'TOTAL', largura));
  linhas.push(divisorSimples);

  // Lista de Itens
  cupom.itens.forEach((item, index) => {
    const num = (index + 1).toString().padStart(2, '0');
    const nomeItem = `${num}. ${item.nome}`;
    const subtotalFormatado = formatarCentavosBRL(item.subtotalCentavos);
    const detalheQtd = `   ${item.quantidade}x ${formatarCentavosBRL(item.precoUnitarioCentavos)}`;

    linhas.push(nomeItem);
    linhas.push(alinharExtremos(detalheQtd, subtotalFormatado, largura));
  });

  linhas.push(divisorSimples);

  // Totais e Descontos
  linhas.push(alinharExtremos('SUBTOTAL:', formatarCentavosBRL(cupom.subtotalCentavos), largura));
  if (cupom.descontoCentavos > 0) {
    linhas.push(alinharExtremos('DESCONTO (-):', formatarCentavosBRL(cupom.descontoCentavos), largura));
  }
  linhas.push(divisorDuplo);
  linhas.push(alinharExtremos('TOTAL A PAGAR:', formatarCentavosBRL(cupom.totalCentavos), largura));
  linhas.push(divisorDuplo);

  // Pagamento
  const nomeFormaPagamento = cupom.formaPagamento.toUpperCase().replace('_', ' ');
  linhas.push(alinharExtremos(`FORMA: ${nomeFormaPagamento}`, formatarCentavosBRL(cupom.valorPagoCentavos), largura));
  if (cupom.trocoCentavos > 0) {
    linhas.push(alinharExtremos('TROCO:', formatarCentavosBRL(cupom.trocoCentavos), largura));
  }

  // Rodapé
  linhas.push(divisorSimples);
  linhas.push(centralizarLinha('Agradecemos a preferencia!', largura));
  linhas.push(centralizarLinha('Doceria do Sr Gilmar - Sistema de Comandas', largura));
  linhas.push(divisorDuplo);
  linhas.push('\n\n'); // Espaço para corte

  return linhas.join('\n');
}

/**
 * Gera HTML estruturado para visualização ou renderização direta em impressoras térmicas (Web e Expo Print).
 */
export function formatarCupomHTML(cupom: CupomImpressao, options?: PrintOptions): string {
  const larguraMm = options?.larguraColunas === 32 ? '58mm' : '80mm';

  const itensHtml = cupom.itens.map((item, idx) => `
    <tr>
      <td colspan="2" style="font-weight: 600; padding-top: 4px;">${idx + 1}. ${item.nome}</td>
    </tr>
    <tr>
      <td style="font-size: 11px; color: #444; padding-bottom: 4px;">
        ${item.quantidade}x ${formatarCentavosBRL(item.precoUnitarioCentavos)}
      </td>
      <td style="text-align: right; font-weight: 500; padding-bottom: 4px;">
        ${formatarCentavosBRL(item.subtotalCentavos)}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cupom Comanda ${cupom.comanda.codigo}</title>
  <style>
    @page {
      margin: 0;
      size: ${larguraMm} auto;
    }
    body {
      margin: 0;
      padding: 12px 10px;
      width: ${larguraMm};
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
    .subtitle { font-size: 11px; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .divider-double { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .row-flex { display: flex; justify-content: space-between; margin: 2px 0; }
    .total-highlight {
      font-size: 14px;
      font-weight: bold;
      margin: 6px 0;
      padding: 4px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">${cupom.empresa.nome}</div>
    ${cupom.empresa.cnpj ? `<div class="subtitle">CNPJ: ${cupom.empresa.cnpj}</div>` : ''}
    ${cupom.empresa.endereco ? `<div class="subtitle">${cupom.empresa.endereco}</div>` : ''}
    ${cupom.empresa.telefone ? `<div class="subtitle">Tel: ${cupom.empresa.telefone}</div>` : ''}
  </div>

  <div class="divider-double"></div>
  <div class="text-center bold" style="font-size: 11px;">*** DOCUMENTO NAO FISCAL ***</div>
  <div class="text-center" style="font-size: 11px;">EXTRATO DE CONFERENCIA DE CONTA</div>
  <div class="divider"></div>

  <div class="row-flex">
    <span class="bold">COMANDA: ${cupom.comanda.codigo}</span>
    <span class="bold">MESA: ${cupom.comanda.mesa}</span>
  </div>
  <div class="row-flex">
    <span>Atendente: ${cupom.comanda.atendente}</span>
  </div>
  <div class="row-flex" style="font-size: 10px;">
    <span>Abertura: ${new Date(cupom.comanda.abertaEm).toLocaleString('pt-BR')}</span>
  </div>
  <div class="row-flex" style="font-size: 10px;">
    <span>Fechamento: ${new Date(cupom.comanda.fechadaEm).toLocaleString('pt-BR')}</span>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000; font-size: 11px;">
        <th style="text-align: left; padding-bottom: 4px;">ITEM / QTD</th>
        <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="row-flex">
    <span>SUBTOTAL:</span>
    <span>${formatarCentavosBRL(cupom.subtotalCentavos)}</span>
  </div>
  ${cupom.descontoCentavos > 0 ? `
  <div class="row-flex" style="color: #b91c1c;">
    <span>DESCONTO:</span>
    <span>- ${formatarCentavosBRL(cupom.descontoCentavos)}</span>
  </div>` : ''}

  <div class="total-highlight">
    <span>TOTAL:</span>
    <span>${formatarCentavosBRL(cupom.totalCentavos)}</span>
  </div>

  <div class="row-flex">
    <span>FORMA PGTO:</span>
    <span class="bold">${cupom.formaPagamento.toUpperCase().replace('_', ' ')}</span>
  </div>
  <div class="row-flex">
    <span>VALOR PAGO:</span>
    <span>${formatarCentavosBRL(cupom.valorPagoCentavos)}</span>
  </div>
  ${cupom.trocoCentavos > 0 ? `
  <div class="row-flex">
    <span>TROCO:</span>
    <span>${formatarCentavosBRL(cupom.trocoCentavos)}</span>
  </div>` : ''}

  <div class="divider"></div>
  <div class="text-center" style="font-size: 11px; margin-top: 6px;">
    <div>Obrigado pela preferencia!</div>
    <div style="font-size: 10px; color: #555; margin-top: 2px;">Doceria do Sr Gilmar - Sistema de Comandas</div>
  </div>
</body>
</html>`;
}
