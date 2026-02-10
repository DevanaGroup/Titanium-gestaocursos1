/**
 * Script de migração: adiciona protocol e origin a todas as aulas (lessons)
 * que ainda não possuem esses campos.
 *
 * - protocol: SOL-YYYYMMDD-XXXX (data do createdAt + 4 chars do id)
 * - origin: "Interno" (aulas existentes são consideradas criadas pelo sistema interno)
 *
 * Carrega .env da raiz do projeto. Use FIREBASE_SERVICE_ACCOUNT_KEY (JSON ou base64)
 * ou GOOGLE_APPLICATION_CREDENTIALS=caminho/para/serviceAccountKey.json
 */

import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.firestore();

  // 1) JSON completo ou base64
  let key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key && String(key).trim() !== "") {
    try {
      const parsed = JSON.parse(
        /^[A-Za-z0-9+/=]+$/.test(key) ? Buffer.from(key, "base64").toString("utf-8") : key
      ) as object;
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return admin.firestore();
    } catch (e) {
      console.error("ERRO: FIREBASE_SERVICE_ACCOUNT_KEY inválido.", e);
      process.exit(1);
    }
  }

  // 2) Arquivo de credenciais
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const path = resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (existsSync(path)) {
      key = readFileSync(path, "utf-8");
      try {
        const parsed = JSON.parse(key) as object;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
        return admin.firestore();
      } catch (e) {
        console.error("ERRO: arquivo em GOOGLE_APPLICATION_CREDENTIALS não é um JSON válido.", e);
        process.exit(1);
      }
    }
  }

  // 3) projectId + clientEmail + privateKey (mesmo padrão do firebase-admin.ts e api/)
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return admin.firestore();
  }

  // 4) Arquivo de chave no projeto (sem precisar de .env)
  const possiblePaths = [
    "serviceAccountKey.json",
    "firebase-key.json",
    "firebase-service-account.json",
  ].map((f) => resolve(process.cwd(), f));
  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      try {
        const key = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(key) as object;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
        console.log(`Credenciais carregadas de: ${filePath}\n`);
        return admin.firestore();
      } catch (e) {
        console.error(`ERRO ao ler ${filePath}:`, e);
        process.exit(1);
      }
    }
  }

  console.error("ERRO: Credenciais do Firebase Admin não encontradas.\n");
  console.error("Opções:");
  console.error("  1) Coloque no projeto um arquivo de chave de serviço com um destes nomes:");
  console.error("     serviceAccountKey.json  |  firebase-key.json  |  firebase-service-account.json");
  console.error("     (Baixe em: Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave)");
  console.error("");
  console.error("  2) Ou defina no .env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  console.error("  3) Ou FIREBASE_SERVICE_ACCOUNT_KEY=<JSON da chave> ou GOOGLE_APPLICATION_CREDENTIALS=caminho/arquivo.json");
  process.exit(1);
}

const db = ensureFirebaseAdmin();

function formatProtocol(createdAt: admin.firestore.Timestamp | Date, docId: string): string {
  const date = createdAt instanceof Date ? createdAt : (createdAt as admin.firestore.Timestamp).toDate();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = docId.replace(/-/g, "").slice(0, 4).toUpperCase() || "0000";
  return `SOL-${yyyymmdd}-${suffix}`;
}

async function migrateLessonsProtocolAndOrigin() {
  console.log("Iniciando migração: protocol e origin em lessons...\n");

  const snapshot = await db.collection("lessons").get();
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.deletedAt != null) {
      skipped++;
      continue;
    }
    const hasProtocol = data.protocol != null && String(data.protocol).trim() !== "";
    const hasOrigin = data.origin === "Externo" || data.origin === "Interno";
    if (hasProtocol && hasOrigin) {
      skipped++;
      continue;
    }

    try {
      const updates: Record<string, unknown> = {};
      if (!hasProtocol) {
        const createdAt = data.createdAt ?? admin.firestore.Timestamp.now();
        updates.protocol = formatProtocol(createdAt, doc.id);
      }
      if (!hasOrigin) {
        updates.origin = "Interno";
      }
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await doc.ref.update(updates);
      updated++;
      console.log(`  [OK] ${doc.id} -> protocol: ${(updates.protocol as string) ?? data.protocol}, origin: ${(updates.origin as string) ?? data.origin}`);
    } catch (e) {
      errors++;
      console.error(`  [ERRO] ${doc.id}:`, e);
    }
  }

  console.log("\n--- Resumo ---");
  console.log(`Total de documentos: ${snapshot.size}`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Ignorados (já preenchidos ou deletados): ${skipped}`);
  console.log(`Erros: ${errors}`);
}

migrateLessonsProtocolAndOrigin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha na migração:", err);
    process.exit(1);
  });
