import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MesaStatus, ComandaStatus } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { getMesaStatusLabel, getComandaStatusLabel } from '../services/api';

interface StatusBadgeProps {
  status: MesaStatus | ComandaStatus;
  type?: 'mesa' | 'comanda';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'mesa',
  size = 'md',
}) => {
  let label = '';
  let bgColor = COLORS.statusLivreBg;
  let textColor = COLORS.statusLivre;
  let borderColor = COLORS.statusLivreBorder;

  if (type === 'mesa') {
    label = getMesaStatusLabel(status as MesaStatus);
    switch (status) {
      case MesaStatus.LIVRE:
        bgColor = COLORS.statusLivreBg;
        textColor = COLORS.statusLivre;
        borderColor = COLORS.statusLivreBorder;
        break;
      case MesaStatus.OCUPADA:
        bgColor = COLORS.statusOcupadaBg;
        textColor = COLORS.statusOcupada;
        borderColor = COLORS.statusOcupadaBorder;
        break;
      case MesaStatus.PEDINDO_CONTA:
        bgColor = COLORS.statusPedindoContaBg;
        textColor = COLORS.statusPedindoConta;
        borderColor = COLORS.statusPedindoContaBorder;
        break;
    }
  } else {
    label = getComandaStatusLabel(status as ComandaStatus);
    switch (status) {
      case ComandaStatus.ABERTA:
        bgColor = COLORS.statusOcupadaBg;
        textColor = COLORS.statusOcupada;
        borderColor = COLORS.statusOcupadaBorder;
        break;
      case ComandaStatus.PEDINDO_CONTA:
        bgColor = COLORS.statusPedindoContaBg;
        textColor = COLORS.statusPedindoConta;
        borderColor = COLORS.statusPedindoContaBorder;
        break;
      case ComandaStatus.PAGA:
        bgColor = COLORS.statusLivreBg;
        textColor = COLORS.statusLivre;
        borderColor = COLORS.statusLivreBorder;
        break;
      case ComandaStatus.CANCELADA:
        bgColor = '#FEF2F2';
        textColor = COLORS.danger;
        borderColor = '#FECACA';
        break;
    }
  }

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          paddingHorizontal: isSmall ? 6 : isLarge ? 12 : 8,
          paddingVertical: isSmall ? 2 : isLarge ? 6 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: isSmall ? FONT_SIZES.xs - 1 : isLarge ? FONT_SIZES.md : FONT_SIZES.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
