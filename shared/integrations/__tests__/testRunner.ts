import { FormaPagamento, UserRole, TipoNotificacao } from '../../types';
import { CupomImpressao } from '../../ports';
import {
  formatarCentavosBRL,
  formatarCupomTexto,
  formatarCupomHTML,
  ThermalSimulatorPrintAdapter,
  NotificacaoService,
} from '../index';
import { WebWindowPrintAdapter, WebNotificacaoService } from '../../../web/src/integrations';
import { MobileExpoPrintAdapter, MobileNotificacaoService } from '../../../mobile/src/integrations';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES: INTEGRAÇÕES & ADAPTERS');
  console.log('====================================================\n');

  const cupomExemplo: CupomImpressao = {
    empresa: {
      nome: 'Doceria do Sr Gilmar',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua das Delícias, 123 - Centro',
      telefone: '(11) 98765-4321',
    },
    comanda: {
      codigo: 'CMD-101',
      mesa: 5,
      atendente: 'Maria Silva',
      abertaEm: '2026-09-25T14:30:00Z',
      fechadaEm: '2026-09-25T15:15:00Z',
    },
    itens: [
      {
        nome: 'Fatia de Torta Holandesa',
        quantidade: 2,
        precoUnitarioCentavos: 1850,
        subtotalCentavos: 3700,
      },
      {
        nome: 'Café Expresso Duplo',
        quantidade: 1,
        precoUnitarioCentavos: 900,
        subtotalCentavos: 900,
      },
    ],
    subtotalCentavos: 4600,
    descontoCentavos: 460,
    totalCentavos: 4140,
    formaPagamento: FormaPagamento.PIX,
    valorPagoCentavos: 4140,
    trocoCentavos: 0,
  };

  // ----------------------------------------------------
  // 1. Testes de Formatação
  // ----------------------------------------------------
  console.log('📌 1. Formatador de Moeda e Cupom Térmico');
  assert(formatarCentavosBRL(4140) === 'R$ 41,40', 'Formatação de centavos BRL');
  assert(formatarCentavosBRL(0) === 'R$ 0,00', 'Formatação de zero BRL');
  assert(formatarCentavosBRL(1234567) === 'R$ 12.345,67', 'Formatação de milhares BRL');

  const textoCupom = formatarCupomTexto(cupomExemplo, { larguraColunas: 48 });
  assert(textoCupom.includes('DOCERIA DO SR GILMAR'), 'Contém nome da empresa no cupom');
  assert(textoCupom.includes('CMD-101'), 'Contém código da comanda');
  assert(textoCupom.includes('MESA: 5'), 'Contém identificação da mesa');
  assert(textoCupom.includes('Fatia de Torta Holandesa'), 'Contém lista de itens');
  assert(textoCupom.includes('R$ 41,40'), 'Contém total formatado');
  assert(textoCupom.includes('PIX'), 'Contém forma de pagamento');

  const htmlCupom = formatarCupomHTML(cupomExemplo, { larguraColunas: 48 });
  assert(htmlCupom.includes('<!DOCTYPE html>'), 'Gera HTML válido para impressão');
  assert(htmlCupom.includes('CMD-101'), 'HTML contém identificação da comanda');

  // ----------------------------------------------------
  // 2. Simulador de Cupom Térmico (PrintPort)
  // ----------------------------------------------------
  console.log('\n📌 2. ThermalSimulatorPrintAdapter');
  const simulador = new ThermalSimulatorPrintAdapter({
    logToConsole: false,
    latenciaSimuladaMs: 10,
  });

  const resultadoPrint = await simulador.imprimirCupom(cupomExemplo);
  assert(resultadoPrint.sucesso === true, 'Impressão simulada com sucesso');
  assert(resultadoPrint.adaptadorUtilizado === 'ThermalSimulatorPrintAdapter', 'Identifica adaptador');
  assert(simulador.getHistorico().length === 1, 'Histórico armazena o cupom emitido');

  const statusSimulador = await simulador.verificarStatus();
  assert(statusSimulador.online === true && statusSimulador.pronto === true, 'Status do simulador online');

  // Teste de simulação de falha
  simulador.setConfig({ simularFalha: true, mensagemFalha: 'Sem papel' });
  const resultadoFalha = await simulador.imprimirCupom(cupomExemplo);
  assert(resultadoFalha.sucesso === false, 'Detecta falha simulada');
  assert(resultadoFalha.mensagem === 'Sem papel', 'Mensagem de falha correta');

  // ----------------------------------------------------
  // 3. Web Window Print Adapter
  // ----------------------------------------------------
  console.log('\n📌 3. WebWindowPrintAdapter (com fallback SSR)');
  const webAdapter = new WebWindowPrintAdapter({
    fallbackSimulatorSeSemDOM: true,
  });

  const webResultado = await webAdapter.imprimirCupom(cupomExemplo);
  assert(webResultado.sucesso === true, 'Web Adapter funciona com fallback transparente em Node/SSR');
  const webStatus = await webAdapter.verificarStatus();
  assert(typeof webStatus.online === 'boolean', 'Retorna status de ambiente web');

  // ----------------------------------------------------
  // 4. Mobile Expo Print Adapter
  // ----------------------------------------------------
  console.log('\n📌 4. MobileExpoPrintAdapter (Mock Expo Native)');
  let mockHtmlRecebido = '';
  const mockExpoPrintModule = {
    printAsync: async (options: { html: string }) => {
      mockHtmlRecebido = options.html;
    },
  };

  const mobileAdapter = new MobileExpoPrintAdapter({
    expoPrintModule: mockExpoPrintModule,
  });

  const mobileResultado = await mobileAdapter.imprimirCupom(cupomExemplo);
  assert(mobileResultado.sucesso === true, 'Mobile Adapter imprime via mock nativo');
  assert(mockHtmlRecebido.includes('CMD-101'), 'Envia HTML com código da comanda para o driver');

  // ----------------------------------------------------
  // 5. NotificacaoService (Tempo Real, Filtros e Deduplicação)
  // ----------------------------------------------------
  console.log('\n📌 5. NotificacaoService & Notificações em Tempo Real');
  const notifService = new NotificacaoService({ ttlDeduplicacaoMs: 500 });

  let notifCaixaRecebida = false;
  let notifAdminRecebida = false;

  const subCaixa = notifService.inscreverPorRole(UserRole.CAIXA, (notif) => {
    if (notif.tipo === TipoNotificacao.PEDIR_CONTA) {
      notifCaixaRecebida = true;
    }
  });

  const subAdmin = notifService.inscreverPorRole(UserRole.ADMIN, (notif) => {
    if (notif.tipo === TipoNotificacao.DESCONTO_ALTO) {
      notifAdminRecebida = true;
    }
  });

  // Emissão de 'Pedir Conta'
  await notifService.notificarPedirConta({
    comandaId: 'cmd_123',
    mesaNumero: 4,
    atendenteNome: 'João',
  });

  assert(notifCaixaRecebida === true, 'Caixa recebe notificação de Pedir Conta');
  assert(notifAdminRecebida === false, 'Admin não recebe notificação restrita ao Caixa');

  // Emissão de 'Desconto Alto'
  await notifService.notificarDescontoAlto({
    comandaId: 'cmd_999',
    mesaNumero: 8,
    percentualDesconto: 20,
    valorDescontoCentavos: 1500,
    operadorNome: 'Carlos',
  });

  assert(notifAdminRecebida === true, 'Admin recebe alerta de Desconto Alto');

  // Teste de Deduplicação
  let contagemAlertasDuplicados = 0;
  notifService.inscrever((_) => {
    contagemAlertasDuplicados++;
  }, { tipo: TipoNotificacao.PEDIR_CONTA, comandaId: 'cmd_dup' });

  await notifService.notificarPedirConta({ comandaId: 'cmd_dup', mesaNumero: 10 });
  await notifService.notificarPedirConta({ comandaId: 'cmd_dup', mesaNumero: 10 }); // Repetição imediata

  assert(contagemAlertasDuplicados === 1, 'Deduplicação evita disparo duplo de evento idêntico');

  // Teste de cancelamento de subscrição
  subCaixa.unsubscribe();
  subAdmin.unsubscribe();

  // ----------------------------------------------------
  // 6. WebNotificacaoService & MobileNotificacaoService
  // ----------------------------------------------------
  console.log('\n📌 6. Web & Mobile Notificacao Services');
  const webNotif = new WebNotificacaoService({ habilitarSom: false });
  let webNotifDisparada = false;
  webNotif.monitorarParaRole(UserRole.CAIXA, (_) => {
    webNotifDisparada = true;
  });

  await webNotif.getBaseService().notificarPedirConta({ comandaId: 'cmd_web_1', mesaNumero: 2 });
  assert(webNotifDisparada === true, 'WebNotificacaoService recebe evento de monitoramento');

  let vibrouMobile = false;
  const mobileNotif = new MobileNotificacaoService({
    vibrationModule: {
      vibrate: () => {
        vibrouMobile = true;
      },
    },
  });

  let mobileNotifDisparada = false;
  mobileNotif.monitorarParaRole(UserRole.ATENDENTE, (_) => {
    mobileNotifDisparada = true;
  });

  await mobileNotif.getBaseService().emitir({
    id: 'mob_notif_1',
    tipo: 'comanda_pronta',
    titulo: 'Pedido Pronto',
    mensagem: 'Bolo da Mesa 7 pronto',
    destinatarioRole: UserRole.ATENDENTE,
    lida: false,
    timestamp: new Date().toISOString(),
  });

  assert(mobileNotifDisparada === true, 'MobileNotificacaoService recebe evento');
  assert(vibrouMobile === true, 'MobileNotificacaoService aciona vibração tátil');

  console.log('\n====================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Erro na execução dos testes:', err);
  process.exit(1);
});
