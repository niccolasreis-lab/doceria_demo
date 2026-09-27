export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Mesas: undefined;
  Catalogo: { orderId?: string } | undefined;
  ComandaDetalhes: { tableId: string };
  Perfil: undefined;
};
