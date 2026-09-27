import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useComanda } from '../context/ComandaContext';
import { MesaStatus, MobileTable } from '../types';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../constants/theme';
import { Header } from '../components/Header';
import { TableCard } from '../components/TableCard';
import { EmptyState } from '../components/EmptyState';
import { AbrirComandaModal } from './AbrirComandaModal';
import { UtensilsCrossed, Filter, Plus } from 'lucide-react-native';
import { triggerHaptic } from '../services/haptics';

interface MesasScreenProps {
  navigation: any;
}

export const MesasScreen: React.FC<MesasScreenProps> = ({ navigation }) => {
  const {
    filteredTables,
    filterStatus,
    setFilterStatus,
    selectMesa,
    orders,
    refreshData,
  } = useComanda();

  const [modalOpenTable, setModalOpenTable] = useState<MobileTable | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleSelectTable = (table: MobileTable) => {
    selectMesa(table.id);
    if (table.status === MesaStatus.LIVRE) {
      setModalOpenTable(table);
    } else {
      navigation.navigate('ComandaDetalhes', { tableId: table.id });
    }
  };

  const handleOpenModal = (table: MobileTable) => {
    setModalOpenTable(table);
  };

  const filterOptions: { id: MesaStatus | 'TODAS'; label: string; countBadge?: number }[] = [
    { id: 'TODAS', label: 'Todas as Mesas' },
    { id: MesaStatus.LIVRE, label: 'Livres' },
    { id: MesaStatus.OCUPADA, label: 'Ocupadas' },
    { id: MesaStatus.PEDINDO_CONTA, label: 'Pedindo Conta' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <Header
        title="Mapa de Mesas"
        subtitle="Salão & Bistrôs"
        onOpenProfile={() => navigation.navigate('Perfil')}
      />

      {/* Barra de Filtros de Status */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = filterStatus === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic('light');
                  setFilterStatus(item.id);
                }}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                  item.id === MesaStatus.PEDINDO_CONTA && isSelected && styles.filterPillWarning,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Grade / Lista de Mesas */}
      <FlatList
        data={filteredTables}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tablesList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<UtensilsCrossed size={40} color={COLORS.textMuted} />}
            title="Nenhuma mesa encontrada"
            description="Não há mesas correspondentes ao filtro de status selecionado."
            actionTitle="Ver Todas as Mesas"
            onAction={() => setFilterStatus('TODAS')}
          />
        }
        renderItem={({ item }) => {
          const activeOrder = orders.find((o) => o.id === item.currentOrderId);
          return (
            <TableCard
              table={item}
              activeOrder={activeOrder}
              onPress={() => handleSelectTable(item)}
              onOpenOrder={() => handleOpenModal(item)}
            />
          );
        }}
      />

      {/* Modal de Abertura de Comanda */}
      {modalOpenTable && (
        <AbrirComandaModal
          visible={!!modalOpenTable}
          table={modalOpenTable}
          onClose={() => setModalOpenTable(null)}
          onSuccess={(createdOrder) => {
            setModalOpenTable(null);
            navigation.navigate('ComandaDetalhes', { tableId: modalOpenTable.id });
          }}
          onSuccessGoToCatalog={(createdOrder) => {
            setModalOpenTable(null);
            navigation.navigate('Catalogo', { orderId: createdOrder.id });
          }}
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
  filtersContainer: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterPillWarning: {
    backgroundColor: COLORS.statusPedindoConta,
    borderColor: COLORS.statusPedindoConta,
  },
  filterPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterPillTextSelected: {
    color: COLORS.textInverted,
  },
  tablesList: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
});
