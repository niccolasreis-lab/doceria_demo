import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useComanda } from '../context/ComandaContext';
import { MobileProduct } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { Header } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/EmptyState';
import { LancamentoItemModal } from './LancamentoItemModal';
import { formatCurrency } from '../services/api';
import { ShoppingBag, ArrowLeft, Send, Trash2 } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface CatalogoScreenProps {
  route?: any;
  navigation: any;
}

export const CatalogoScreen: React.FC<CatalogoScreenProps> = ({ route, navigation }) => {
  const {
    filteredProducts,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    selectedTable,
    selectedOrder,
    cartDraft,
    cartCount,
    cartTotalCentavos,
    adicionarAoCarrinho,
    lancarCarrinhoNaComanda,
    limparCarrinho,
  } = useComanda();

  const [modalProduct, setModalProduct] = useState<MobileProduct | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Se veio por navegação com orderId ou comanda específica
  const orderIdFromRoute = route?.params?.orderId || selectedOrder?.id;
  const targetOrder = selectedOrder?.id === orderIdFromRoute ? selectedOrder : null;

  const handleProductPress = (product: MobileProduct) => {
    setModalProduct(product);
  };

  const handleQuickAdd = (product: MobileProduct) => {
    adicionarAoCarrinho(product, 1);
  };

  const handleConfirmModalAdd = (product: MobileProduct, quantity: number, notes?: string) => {
    adicionarAoCarrinho(product, quantity, notes);
  };

  const handleSendCart = async () => {
    if (!orderIdFromRoute) {
      Alert.alert(
        'Nenhuma comanda selecionada',
        'Selecione uma mesa ocupada no mapa para lançar os itens.'
      );
      return;
    }

    try {
      setSubmitting(true);
      await lancarCarrinhoNaComanda(orderIdFromRoute);
      await triggerHaptic('success');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro ao Lançar', err?.message || 'Falha ao lançar itens.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header Contextual */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={COLORS.textInverted} />
        </TouchableOpacity>

        <View style={styles.topBarTitles}>
          <Text style={styles.topBarTitle}>Catálogo de Produtos</Text>
          {selectedTable ? (
            <Text style={styles.topBarSubtitle}>
              Lançando para Mesa {selectedTable.number} ({selectedOrder?.code || 'Nova'})
            </Text>
          ) : (
            <Text style={styles.topBarSubtitle}>Cardápio Geral da Doceria</Text>
          )}
        </View>
      </View>

      {/* Busca e Categorias */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar bolo, doce, café, salgado..."
        />
      </View>

      <CategoryFilter
        selectedCategory={categoryFilter}
        onSelectCategory={setCategoryFilter}
      />

      {/* Lista de Produtos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.productList,
          cartCount > 0 && { paddingBottom: 110 },
        ]}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum produto encontrado"
            description="Tente buscar por outro termo ou selecione outra categoria."
            actionTitle="Limpar Filtros"
            onAction={() => {
              setSearchQuery('');
              setCategoryFilter('TODOS');
            }}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            onQuickAdd={() => handleQuickAdd(item)}
          />
        )}
      />

      {/* Barra Flutuante de Carrinho de Lançamento */}
      {cartCount > 0 && (
        <View style={[styles.floatingCart, SHADOWS.floatButton]}>
          <View style={styles.cartInfo}>
            <View style={styles.cartCountBadge}>
              <ShoppingBag size={14} color={COLORS.textInverted} />
              <Text style={styles.cartCountText}>{cartCount}</Text>
            </View>
            <View>
              <Text style={styles.cartTotalLabel}>Total Lançamento</Text>
              <Text style={styles.cartTotalValue}>{formatCurrency(cartTotalCentavos)}</Text>
            </View>
          </View>

          <View style={styles.cartActions}>
            <TouchableOpacity
              onPress={limparCarrinho}
              style={styles.clearCartBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSendCart}
              disabled={submitting}
              style={styles.sendCartBtn}
            >
              <Send size={16} color={COLORS.textInverted} />
              <Text style={styles.sendCartBtnText}>
                {submitting ? 'Lançando...' : 'Confirmar Lançamento'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Detalhes e Observação do Item */}
      {modalProduct && (
        <LancamentoItemModal
          visible={!!modalProduct}
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={handleConfirmModalAdd}
        />
      )}
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
  topBarTitles: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.textInverted,
  },
  topBarSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryLight,
  },
  searchSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productList: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  floatingCart: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cartCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  cartCountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    color: COLORS.textInverted,
  },
  cartTotalLabel: {
    fontSize: 10,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
  },
  cartTotalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    color: COLORS.textInverted,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  clearCartBtn: {
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
  },
  sendCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryAccent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  sendCartBtnText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
});
