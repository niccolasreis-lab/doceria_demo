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
import { MobileProduct } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../services/api';
import { QuantitySelector } from '../components/QuantitySelector';
import { Button } from '../components/Button';
import { X, MessageSquare, Plus, Check } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface LancamentoItemModalProps {
  visible: boolean;
  product: MobileProduct;
  onClose: () => void;
  onConfirm: (product: MobileProduct, quantity: number, notes?: string) => void;
}

const QUICK_NOTES: string[] = [
  'Sem açúcar',
  'Bem gelado',
  'Com gelo e limão',
  'Aquecer bem',
  'Pratinho e garfo extra',
  'Para viagem',
  'Caprichar na canela',
];

export const LancamentoItemModal: React.FC<LancamentoItemModalProps> = ({
  visible,
  product,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const subtotal = product.priceCentavos * quantity;

  const handleToggleQuickNote = (noteText: string) => {
    triggerHaptic('light');
    if (notes.includes(noteText)) {
      setNotes((prev) =>
        prev
          .replace(noteText, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|\s*,\s*$/g, '')
          .trim()
      );
    } else {
      setNotes((prev) => (prev ? `${prev}, ${noteText}` : noteText));
    }
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    onConfirm(product, quantity, notes.trim() || undefined);
    onClose();
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
          {/* Header do Produto */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.categoryBadge}>{product.category.replace('_', ' ')}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.unitPrice}>
                {formatCurrency(product.priceCentavos)} cada
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
            {/* Descrição do Produto se houver */}
            {product.description && (
              <Text style={styles.description}>{product.description}</Text>
            )}

            {/* Alergênicos se houver */}
            {product.allergens && product.allergens.length > 0 && (
              <View style={styles.allergensContainer}>
                <Text style={styles.allergensTitle}>Contém: </Text>
                <Text style={styles.allergensList}>{product.allergens.join(', ')}</Text>
              </View>
            )}

            {/* Seletor de Quantidade */}
            <View style={styles.quantitySection}>
              <Text style={styles.sectionLabel}>Quantidade:</Text>
              <QuantitySelector
                quantity={quantity}
                onIncrease={() => setQuantity((q) => q + 1)}
                onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                size="lg"
              />
            </View>

            {/* Observações & Personalizações */}
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <MessageSquare size={16} color={COLORS.primaryDark} />
                <Text style={styles.sectionLabel}>Observações e Personalizações</Text>
              </View>

              {/* Chips Rápidos */}
              <View style={styles.quickChipsContainer}>
                {QUICK_NOTES.map((qNote) => {
                  const isSelected = notes.includes(qNote);
                  return (
                    <TouchableOpacity
                      key={qNote}
                      activeOpacity={0.7}
                      onPress={() => handleToggleQuickNote(qNote)}
                      style={[
                        styles.quickChip,
                        isSelected && styles.quickChipSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={12} color={COLORS.textInverted} style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextSelected,
                        ]}
                      >
                        {qNote}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Input Livre de Observação */}
              <TextInput
                style={styles.notesInput}
                placeholder="Digite outras observações para a cozinha/bar..."
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                maxLength={120}
              />
            </View>
          </ScrollView>

          {/* Rodapé com Subtotal e Botão Confirmar */}
          <View style={styles.footer}>
            <View style={styles.totalInfo}>
              <Text style={styles.totalLabel}>Subtotal ({quantity}x):</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>

            <Button
              title="Adicionar ao Lançamento"
              onPress={handleConfirm}
              variant="primary"
              size="lg"
              icon={<Plus size={18} color={COLORS.textInverted} />}
              style={styles.confirmBtn}
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
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerInfo: {
    flex: 1,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  unitPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.bgSurface,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
  body: {
    paddingVertical: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  allergensContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.goldBg,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  allergensTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  allergensList: {
    fontSize: FONT_SIZES.xs,
    color: '#92400E',
    flex: 1,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgSurface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notesSection: {
    marginBottom: SPACING.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  quickChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  quickChipSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  quickChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickChipTextSelected: {
    color: COLORS.textInverted,
  },
  notesInput: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  confirmBtn: {
    width: '100%',
  },
});
