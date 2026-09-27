import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { Coffee, User, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { Button } from '../components/Button';
import { triggerHaptic } from '../services/haptics';

export const LoginScreen: React.FC = () => {
  const { availableAttendants, selectAttendant, login } = useAuth();
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>(
    availableAttendants[0]?.$id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSelectProfile = (id: string) => {
    triggerHaptic('light');
    setSelectedAttendantId(id);
    setErrorMsg('');
  };

  const handleConfirmLogin = async () => {
    const attendant = availableAttendants.find((a) => a.$id === selectedAttendantId);
    if (!attendant) {
      setErrorMsg('Selecione um atendente para continuar.');
      return;
    }

    try {
      selectAttendant(attendant.$id);
      await triggerHaptic('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autenticar.');
      await triggerHaptic('error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Visual com Marca */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Coffee size={36} color={COLORS.textInverted} />
          </View>
          <Text style={styles.brandTitle}>DOCERIA DO SR GILMAR</Text>
          <Text style={styles.brandSubtitle}>Terminal Mobile do Atendente</Text>
          <View style={styles.badgeSaloon}>
            <ShieldCheck size={14} color={COLORS.primaryLight} />
            <Text style={styles.badgeSaloonText}>Sessão Segura do Salão</Text>
          </View>
        </View>

        {/* Card de Seleção de Perfil */}
        <View style={[styles.card, SHADOWS.card]}>
          <Text style={styles.sectionTitle}>Selecione seu Perfil de Atendente</Text>
          <Text style={styles.sectionSubtitle}>
            Toque no seu nome para assumir o turno no salão
          </Text>

          {availableAttendants.map((attendant) => {
            const isSelected = selectedAttendantId === attendant.$id;
            return (
              <TouchableOpacity
                key={attendant.$id}
                activeOpacity={0.8}
                onPress={() => handleSelectProfile(attendant.$id)}
                style={[
                  styles.attendantOption,
                  isSelected && styles.attendantOptionSelected,
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    isSelected ? styles.avatarSelected : styles.avatarUnselected,
                  ]}
                >
                  <User
                    size={20}
                    color={isSelected ? COLORS.textInverted : COLORS.primaryDark}
                  />
                </View>

                <View style={styles.attendantInfo}>
                  <Text
                    style={[
                      styles.attendantName,
                      isSelected && styles.attendantNameSelected,
                    ]}
                  >
                    {attendant.nome}
                  </Text>
                  <Text style={styles.attendantEmail}>{attendant.email}</Text>
                </View>

                {isSelected ? (
                  <CheckCircle2 size={22} color={COLORS.primary} />
                ) : (
                  <View style={styles.uncheckCircle} />
                )}
              </TouchableOpacity>
            );
          })}

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Botão de Entrada */}
          <Button
            title="Entrar no Sistema do Salão"
            onPress={handleConfirmLogin}
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} color={COLORS.textInverted} />}
            style={styles.submitButton}
          />
        </View>

        {/* Rodapé Informativo */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Doceria do Sr Gilmar v1.0.0 • Salão & Comandas SaaS
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.floatButton,
  },
  brandTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  badgeSaloon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
    gap: 6,
  },
  badgeSaloonText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  attendantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgLight,
  },
  attendantOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarSelected: {
    backgroundColor: COLORS.primary,
  },
  avatarUnselected: {
    backgroundColor: COLORS.bgSurface,
  },
  attendantInfo: {
    flex: 1,
  },
  attendantName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  attendantNameSelected: {
    color: COLORS.primaryDark,
  },
  attendantEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  uncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
  footerInfo: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textMuted,
  },
});
