import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useComanda } from '../context/ComandaContext';
import { User, LogOut, Coffee } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showProfileSelector?: boolean;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Doceria do Sr. Gilmar',
  subtitle,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { tables } = useComanda();

  const occupiedCount = tables.filter((t) => t.status !== 'livre').length;
  const billCount = tables.filter((t) => t.status === 'pedindo_conta').length;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoIcon}>
            <Coffee size={18} color={COLORS.textInverted} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : (
              <Text style={styles.subtitle}>Sistema de Salão & Comandas</Text>
            )}
          </View>
        </View>

        {user && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic('light');
              if (onOpenProfile) onOpenProfile();
            }}
            style={styles.userBadge}
          >
            <View style={styles.userAvatar}>
              <User size={14} color={COLORS.primaryDark} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.nome.split(' ')[0]}
              </Text>
              <Text style={styles.userRole}>Atendente</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Barzinha de resumo rápido do salão */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Mesas: </Text>
          <Text style={styles.summaryValue}>{tables.length}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Ocupadas: </Text>
          <Text style={[styles.summaryValue, { color: COLORS.statusOcupada }]}>
            {occupiedCount}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pedindo Conta: </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: billCount > 0 ? COLORS.statusPedindoConta : COLORS.textMuted },
            ]}
          >
            {billCount}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textInverted,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.primaryLight,
    fontWeight: '500',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  userInfo: {
    maxWidth: 90,
  },
  userName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textInverted,
  },
  userRole: {
    fontSize: 9,
    color: COLORS.primaryLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryLight,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    color: COLORS.textInverted,
  },
  summaryDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
