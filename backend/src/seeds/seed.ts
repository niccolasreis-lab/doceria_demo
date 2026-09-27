import { Client, Databases, ID, Query } from 'node-appwrite';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../core/config.js';
import { SEED_TABLES, SEED_PRODUCTS, SEED_PROFILES } from './data.js';

export async function runSeed(dryRun = false) {
  console.log(`[SEED] Iniciando seed de dados iniciais para a Doceria do Sr. Gilmar`);

  if (dryRun || !process.env.APPWRITE_API_KEY) {
    console.log(`[SEED - DRY RUN] Modo dry-run ou sem APPWRITE_API_KEY. Resumo do dataset:`);
    console.log(`  - Mesas: ${SEED_TABLES.length} mesas`);
    console.log(`  - Produtos: ${SEED_PRODUCTS.length} itens do cardápio`);
    console.log(`  - Perfis: ${SEED_PROFILES.length} perfis de teste`);
    console.log(`[SEED - DRY RUN] Validação do seed concluída com sucesso.`);
    return;
  }

  const client = new Client()
    .setEndpoint(CONFIG.APPWRITE_ENDPOINT)
    .setProject(CONFIG.APPWRITE_PROJECT_ID)
    .setKey(CONFIG.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // 1. Mesas
  console.log(`[SEED] Semeando mesas...`);
  for (const mesa of SEED_TABLES) {
    try {
      const existing = await databases.listDocuments(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.MESAS,
        [Query.equal('numero', mesa.numero)]
      );

      if (existing.total === 0) {
        await databases.createDocument(
          CONFIG.DATABASE_ID,
          CONFIG.COLLECTIONS.MESAS,
          ID.unique(),
          mesa
        );
        console.log(`  + Mesa ${mesa.numero} inserida`);
      }
    } catch (err: any) {
      console.warn(`  ! Erro ao semear mesa ${mesa.numero}: ${err.message}`);
    }
  }

  // 2. Produtos
  console.log(`[SEED] Semeando produtos...`);
  for (const prod of SEED_PRODUCTS) {
    try {
      const existing = await databases.listDocuments(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.PRODUTOS,
        [Query.equal('nome', prod.nome)]
      );

      if (existing.total === 0) {
        await databases.createDocument(
          CONFIG.DATABASE_ID,
          CONFIG.COLLECTIONS.PRODUTOS,
          ID.unique(),
          prod
        );
        console.log(`  + Produto '${prod.nome}' inserido (R$ ${(prod.preco_centavos / 100).toFixed(2)})`);
      }
    } catch (err: any) {
      console.warn(`  ! Erro ao semear produto '${prod.nome}': ${err.message}`);
    }
  }

  // 3. Perfis
  console.log(`[SEED] Semeando perfis...`);
  for (const perfil of SEED_PROFILES) {
    try {
      const existing = await databases.listDocuments(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.PROFILES,
        [Query.equal('email', perfil.email)]
      );

      if (existing.total === 0) {
        await databases.createDocument(
          CONFIG.DATABASE_ID,
          CONFIG.COLLECTIONS.PROFILES,
          ID.unique(),
          perfil
        );
        console.log(`  + Perfil '${perfil.nome}' inserido (${perfil.role})`);
      }
    } catch (err: any) {
      console.warn(`  ! Erro ao semear perfil '${perfil.email}': ${err.message}`);
    }
  }

  console.log(`[SEED] Seed finalizado.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDryRun = process.argv.includes('--dry-run');
  runSeed(isDryRun).catch((err) => {
    console.error('[SEED - ERROR]', err);
    process.exit(1);
  });
}
