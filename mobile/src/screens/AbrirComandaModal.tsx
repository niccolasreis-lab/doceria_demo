import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MobileTable, MobileOrder } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { useComanda } from '../context/ComandaContext';
import { QuantitySelector } from '../components/QuantitySelector';
import { Button } from '../components/Button';
import { X, Users, User, FileText, ShoppingBag } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface AbrirComandaModalProps {
  visible: boolean;
  table: MobileTable;
  onClose: () => void;
  onSuccess: (order: MobileOrder) => void;
  onSuccessGoToCatalog: (order: MobileOrder) => void;
}

export const AbrirComandaModal: React.FC<AbrirComandaModalProps> = ({
  visible,
  table,
  onClose,
  onSuccess,
  onSuccessGoToCatalog,
}) => {
  const { abrirComanda } = useComanda();

  const [customerName, setCustomerName] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(table.seats || 2);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleOpenOnly = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const order = await abrirComanda(
        table.id,
        customerName.trim() || undefined,
        partySize,
        notes.trim() || undefined
      );
      onSuccess(order);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao abrir comanda.');
      await triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAndCatalog = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const order = await abrirComanda(
        table.id,
        customerName.trim() || undefined,
        partySize,
        notes.trim() || undefined
      );
      onSuccessGoToCatalog(order);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao abrir comanda.');
      await triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, SHADOWS.cardHover]}>
          {/* Header do Modal */}
          <View style={styles.header}>
            <View style={styles.tableBadge}>
              <Text style={styles.tableBadgeText}>
                Mesa {table.number < 10 ? `0${table.number}` : table.number}
              </Text>
            </View>

            <View style={styles.headerTitles}>
              <Text style={styles.title}>Abrir Nova Comanda</Text>
              <Text style={styles.subtitle}>
                {table.sector?.replace('_', ' ')} • Capacidade {table.seats} lugares
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quantidade de Pessoas */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Users size={16} color={COLORS.primaryDark} />
                <Text style={styles.label}>Número de Ocupantes / Pessoas</Text>
              </View>
              <View style={styles.partySizeRow}>
                <QuantitySelector
                  quantity={partySize}
                  onIncrease={() => setPartySize((prev) => prev + 1)}
                  onDecrease={() => setPartySize((prev) => Math.max(1, prev - 1))}
                  min={1}
                  max={20}
                  size="md"
                />
                <Text style={styles.partyHelperText}>
                  {partySize} {partySize === 1 ? 'cliente' : 'clientes'} na mesa
                </Text>
              </View>
            </View>

            {/* Identificação do Cliente (Opcional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={16} color={COLORS.primaryDark} />
                <Text style={styles.label}>Identificação / Nome do Cliente (Opcional)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Família Silva, Dra. Juliana..."
                placeholderTextColor={COLORS.textMuted}
                value={customerName}
                onChangeText={setCustomerName}
                maxLength={40}
              />
            </View>

            {/* Observações Iniciais */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <FileText size={16} color={COLORS.primaryDark} />
                <Text style={styles.label}>Observações da Mesa</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Ex: Aniversário, cliente com restrição a lactose, etc."
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={150}
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </ScrollView>

          {/* Botões de Ação */}
          <View style={styles.footer}>
            <Button
              title="Abrir e ir ao Catálogo"
              onPress={handleOpenAndCatalog}
              variant="primary"
              size="md"
              loading={loading}
              icon={<ShoppingBag size={18} color={COLORS.textInverted} />}
              style={styles.actionBtnPrimary}
            />

            <Button
              title="Apenas Abrir Mesa"
              onPress={handleOpenOnly}
              variant="secondary"
              size="md"
              disabled={loading}
              style={styles.actionBtnSecondary}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  tableBadgeText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.bgSurface,
    borderRadius: BORDER_RADIUS.full,
  },
  body: {
    paddingVertical: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: 4,
  },
  partyHelperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  footer: {
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtnPrimary: {
    width: '100%',
  },
  actionBtnSecondary: {
    width: '100%',
  },
});
