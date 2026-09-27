import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useComanda } from '../context/ComandaContext';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../services/api';
import { mobileStore } from '../services/store';
import { Button } from '../components/Button';
import {
  ArrowLeft,
  User,
  Shield,
  Coffee,
  RotateCcw,
  LogOut,
  CheckCircle2,
  Receipt,
  Users,
} from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface PerfilScreenProps {
  navigation: any;
}

export const PerfilScreen: React.FC<PerfilScreenProps> = ({ navigation }) => {
  const { user, availableAttendants, switchAttendant, logout } = useAuth();
  const { orders, tables, refreshData } = useComanda();

  if (!user) return null;

  const attendantOrders = orders.filter(
    (o) => o.waiterId === user.$id || o.waiterName === user.nome
  );
  const activeOrdersCount = attendantOrders.filter(
    (o) => o.status === 'aberta' || o.status === 'pedindo_conta'
  ).length;
  const totalVolumeCentavos = attendantOrders.reduce(
    (acc, o) => acc + (o.totalCentavos || 0),
    0
  );

  const handleSwitch = (attendantId: string) => {
    triggerHaptic('light');
    switchAttendant(attendantId);
  };

  const handleResetData = () => {
    Alert.alert(
      'Resetar Dados do Salão',
      'Deseja restaurar as mesas e produtos para o padrão inicial de fábrica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Resetar',
          style: 'destructive',
          onPress: () => {
            mobileStore.resetToDefault();
            refreshData();
            triggerHaptic('success');
            Alert.alert('Pronto!', 'Dados reiniciados com sucesso.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Encerrar Sessão', 'Deseja realmente sair do terminal do atendente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={COLORS.textInverted} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Perfil do Atendente</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card do Usuário Ativo */}
        <View style={[styles.userCard, SHADOWS.card]}>
          <View style={styles.avatarLarge}>
            <User size={36} color={COLORS.textInverted} />
          </View>

          <Text style={styles.userName}>{user.nome}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.roleBadge}>
            <Shield size={12} color={COLORS.primaryDark} />
            <Text style={styles.roleText}>Atendente de Salão (Ativo)</Text>
          </View>
        </View>

        {/* Métricas do Turno */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Métricas do Meu Turno</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, SHADOWS.card]}>
            <Receipt size={20} color={COLORS.primary} />
            <Text style={styles.metricValue}>{activeOrdersCount}</Text>
            <Text style={styles.metricLabel}>Comandas Ativas</Text>
          </View>

          <View style={[styles.metricCard, SHADOWS.card]}>
            <Coffee size={20} color={COLORS.statusPedindoConta} />
            <Text style={styles.metricValue}>
              {attendantOrders.reduce((acc, o) => acc + o.items.length, 0)}
            </Text>
            <Text style={styles.metricLabel}>Itens Lançados</Text>
          </View>

          <View style={[styles.metricCard, SHADOWS.card]}>
            <Users size={20} color={COLORS.statusOcupada} />
            <Text style={[styles.metricValue, { fontSize: FONT_SIZES.md }]}>
              {formatCurrency(totalVolumeCentavos)}
            </Text>
            <Text style={styles.metricLabel}>Volume Atendido</Text>
          </View>
        </View>

        {/* Alternar Atendente Rapidamente */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trocar de Atendente no Terminal</Text>
        </View>

        <View style={[styles.switchContainer, SHADOWS.card]}>
          {availableAttendants.map((attendant) => {
            const isCurrent = attendant.$id === user.$id;
            return (
              <TouchableOpacity
                key={attendant.$id}
                activeOpacity={0.7}
                onPress={() => handleSwitch(attendant.$id)}
                style={[
                  styles.switchRow,
                  isCurrent && styles.switchRowSelected,
                ]}
              >
                <View style={styles.switchInfo}>
                  <Text
                    style={[
                      styles.switchName,
                      isCurrent && styles.switchNameSelected,
                    ]}
                  >
                    {attendant.nome}
                  </Text>
                  <Text style={styles.switchEmail}>{attendant.email}</Text>
                </View>

                {isCurrent && <CheckCircle2 size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ações Administrativas */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ferramentas & Ações</Text>
        </View>

        <View style={[styles.actionsCard, SHADOWS.card]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleResetData}
            style={styles.actionItem}
          >
            <RotateCcw size={18} color={COLORS.textSecondary} />
            <View style={styles.actionItemText}>
              <Text style={styles.actionItemTitle}>Resetar Dados do Salão</Text>
              <Text style={styles.actionItemDesc}>Restaura mesas e comandas de demonstração</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.actionItem}
          >
            <LogOut size={18} color={COLORS.danger} />
            <View style={styles.actionItemText}>
              <Text style={[styles.actionItemTitle, { color: COLORS.danger }]}>
                Encerrar Sessão / Logout
              </Text>
              <Text style={styles.actionItemDesc}>Volta para a tela inicial de login</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  topBarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textInverted,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  userCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  roleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  sectionHeader: {
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 6,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  switchContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  switchRowSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  switchInfo: {
    flex: 1,
  },
  switchName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  switchNameSelected: {
    color: COLORS.primaryDark,
  },
  switchEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  actionsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  actionItemText: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionItemDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  actionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});
