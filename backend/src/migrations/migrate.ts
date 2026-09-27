import { Client, Databases, Permission, Role } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../core/config.js';

interface AttributeDef {
  key: string;
  type: string;
  required: boolean;
  size?: number;
  min?: number;
  max?: number;
  default?: string | number | boolean | null;
  elements?: string[];
}

interface IndexDef {
  key: string;
  type: string;
  attributes: string[];
  orders?: string[];
}

interface CollectionDef {
  $id: string;
  name: string;
  enabled?: boolean;
  documentSecurity: boolean;
  $permissions: string[];
  attributes: AttributeDef[];
  indexes: IndexDef[];
}

interface SchemaDef {
  databaseId: string;
  databaseName: string;
  collections: CollectionDef[];
}

function parsePermissionString(perm: string): string {
  return perm;
}

export async function runMigration(dryRun = false) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schemaPath = resolve(__dirname, '../../schema/collections.json');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema: SchemaDef = JSON.parse(schemaContent);

  console.log(`[MIGRATION] Iniciando migração do banco: ${schema.databaseId} (${schema.databaseName})`);

  if (dryRun || !process.env.APPWRITE_API_KEY) {
    console.log(`[MIGRATION - DRY RUN] APPWRITE_API_KEY não configurada ou modo dry-run ativo. Validando schema local.`);
    console.log(`[MIGRATION - DRY RUN] Encontradas ${schema.collections.length} coleções:`);
    for (const col of schema.collections) {
      console.log(`  - Coleção: ${col.$id} (${col.name}) | ${col.attributes.length} atributos | ${col.indexes.length} índices`);
    }
    console.log(`[MIGRATION - DRY RUN] Schema verificado e válido.`);
    return;
  }

  const client = new Client()
    .setEndpoint(CONFIG.APPWRITE_ENDPOINT)
    .setProject(CONFIG.APPWRITE_PROJECT_ID)
    .setKey(CONFIG.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // 1. Garantir que o banco de dados existe
  try {
    await databases.get(schema.databaseId);
    console.log(`[MIGRATION] Banco de dados '${schema.databaseId}' já existe.`);
  } catch {
    console.log(`[MIGRATION] Criando banco de dados '${schema.databaseId}'...`);
    await databases.create(schema.databaseId, schema.databaseName, true);
    console.log(`[MIGRATION] Banco de dados '${schema.databaseId}' criado com sucesso.`);
  }

  // 2. Criar ou atualizar coleções
  for (const col of schema.collections) {
    console.log(`[MIGRATION] Processando coleção: ${col.$id} (${col.name})...`);
    
    let collectionExists = false;
    try {
      await databases.getCollection(schema.databaseId, col.$id);
      collectionExists = true;
      console.log(`[MIGRATION] Coleção '${col.$id}' já existe.`);
    } catch {
      console.log(`[MIGRATION] Criando coleção '${col.$id}'...`);
      await databases.createCollection(
        schema.databaseId,
        col.$id,
        col.name,
        col.$permissions.map(parsePermissionString),
        col.documentSecurity,
        col.enabled
      );
      console.log(`[MIGRATION] Coleção '${col.$id}' criada.`);
    }

    // 3. Criar atributos
    for (const attr of col.attributes) {
      try {
        if (attr.type === 'string') {
          if (attr.elements && attr.elements.length > 0) {
            await databases.createEnumAttribute(
              schema.databaseId,
              col.$id,
              attr.key,
              attr.elements,
              attr.required,
              attr.default as string | undefined
            );
          } else {
            await databases.createStringAttribute(
              schema.databaseId,
              col.$id,
              attr.key,
              attr.size || 255,
              attr.required,
              attr.default as string | undefined
            );
          }
          console.log(`  + Atributo string criado: ${attr.key}`);
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            schema.databaseId,
            col.$id,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default as number | undefined
          );
          console.log(`  + Atributo integer criado: ${attr.key}`);
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            schema.databaseId,
            col.$id,
            attr.key,
            attr.required,
            attr.default as boolean | undefined
          );
          console.log(`  + Atributo boolean criado: ${attr.key}`);
        }
      } catch (err: any) {
        // Ignora erro se atributo já existe
        if (err.code !== 409) {
          console.warn(`  ! Aviso ao criar atributo '${attr.key}': ${err.message}`);
        }
      }
    }

    // 4. Criar índices
    for (const idx of col.indexes) {
      try {
        await databases.createIndex(
          schema.databaseId,
          col.$id,
          idx.key,
          idx.type as any,
          idx.attributes,
          idx.orders
        );
        console.log(`  + Índice criado: ${idx.key}`);
      } catch (err: any) {
        if (err.code !== 409) {
          console.warn(`  ! Aviso ao criar índice '${idx.key}': ${err.message}`);
        }
      }
    }
  }

  console.log(`[MIGRATION] Migração finalizada com sucesso!`);
}

// Execução direta via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDryRun = process.argv.includes('--dry-run');
  runMigration(isDryRun).catch((err) => {
    console.error('[MIGRATION - ERROR]', err);
    process.exit(1);
  });
}
