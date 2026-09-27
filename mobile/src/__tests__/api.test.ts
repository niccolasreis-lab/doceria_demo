import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatElapsedTime,
  getCategoryLabel,
  getMesaStatusLabel,
  getComandaStatusLabel,
} from '../services/api';
import { MesaStatus, ComandaStatus } from '../types';

describe('API & Formatter Utilities', () => {
  it('deve formatar centavos para moeda BRL corretamente', () => {
    expect(formatCurrency(0)).toBe('R$\xa00,00');
    expect(formatCurrency(1850)).toBe('R$\xa018,50');
    expect(formatCurrency(12683)).toBe('R$\xa0126,83');
  });

  it('deve retornar rótulos em português das categorias', () => {
    expect(getCategoryLabel('BOLOS')).toBe('Bolos Recheados');
    expect(getCategoryLabel('TORTAS')).toBe('Tortas Doces');
    expect(getCategoryLabel('CAFES')).toBe('Cafeteria Especial');
    expect(getCategoryLabel('SALGADOS')).toBe('Salgados Artesanais');
  });

  it('deve retornar rótulos de status das mesas', () => {
    expect(getMesaStatusLabel(MesaStatus.LIVRE)).toBe('LIVRE');
    expect(getMesaStatusLabel(MesaStatus.OCUPADA)).toBe('OCUPADA');
    expect(getMesaStatusLabel(MesaStatus.PEDINDO_CONTA)).toBe('PEDINDO CONTA');
  });

  it('deve retornar rótulos de status das comandas', () => {
    expect(getComandaStatusLabel(ComandaStatus.ABERTA)).toBe('Em Consumo');
    expect(getComandaStatusLabel(ComandaStatus.PEDINDO_CONTA)).toBe('Conta Solicitada');
  });
});
