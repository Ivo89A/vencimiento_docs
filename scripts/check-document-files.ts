import "dotenv/config";
import { parseArgs } from "node:util";
import { createDocumentFileClients } from "../src/infrastructure/document-files/clients";
import { DocumentFileConfigurationError, getDocumentFileEnv } from "../src/lib/env";
import { DocumentFileInfrastructureError } from "../src/infrastructure/document-files/document-file.errors";

async function main() {
  const { values } = parseArgs({ options: { network: { type: "boolean" }, eicar: { type: "boolean" } }, strict: true, allowPositionals: false });
  getDocumentFileEnv();
  if (values.eicar && !values.network) throw new Error("USAGE");
  if (!values.network) {
    console.log("Configuración documental válida. No se contactaron servicios ni se habilitaron cargas.");
    return;
  }
  if (process.env.NODE_ENV === "production" || process.env.DOCUMENT_FILES_VERIFY_ISOLATED !== "true") {
    console.error("Prueba de red bloqueada: requiere DOCUMENT_FILES_VERIFY_ISOLATED=true y un entorno no productivo.");
    process.exitCode = 2;
    return;
  }
  const clients = createDocumentFileClients();
  try {
    await clients.storage.verifyPrivateStorage();
    console.log("S3: escritura/lectura íntegra, acceso anónimo denegado al objeto de prueba y limpieza completada.");
    const clean = await clients.scanner.scan(Buffer.from("gestion-documentos clean infrastructure probe", "utf8"));
    if (clean.status !== "CLEAN") throw new DocumentFileInfrastructureError("ANTIVIRUS_TEST_FAILED");
    console.log("Antimalware: análisis de contenido benigno completado.");
    if (values.eicar) {
      // Standard harmless EICAR test, encoded to avoid embedding its raw signature in source.
      const fixture = Buffer.from("WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=", "base64");
      const infected = await clients.scanner.scan(fixture);
      if (infected.status !== "INFECTED") throw new DocumentFileInfrastructureError("ANTIVIRUS_TEST_FAILED");
      console.log("Antimalware: prueba EICAR detectada correctamente, sin guardar el archivo de prueba en S3.");
    } else {
      console.log("Detección EICAR no verificada. Ejecutá con --eicar solo contra infraestructura de prueba autorizada.");
    }
    console.log("Diagnóstico terminado. No certifica todas las políticas del bucket ni habilita las cargas documentales.");
  } finally { clients.storage.close(); }
}

main().catch((error: unknown) => {
  if (error instanceof DocumentFileConfigurationError) {
    console.error(error.message);
    process.exitCode = 2;
  } else if (error instanceof DocumentFileInfrastructureError) {
    console.error(`${error.code}: ${error.message}`);
    if (error.cleanupFailed) console.error("Además, no se pudo confirmar la limpieza del objeto de diagnóstico. Revisar el bucket de prueba.");
    process.exitCode = 1;
  } else {
    console.error("Diagnóstico documental fallido. Revisá argumentos, configuración y conectividad; no se imprimieron secretos.");
    process.exitCode = 1;
  }
});
