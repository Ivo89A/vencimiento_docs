const messages = {
  STORAGE_UNAVAILABLE: "No se pudo acceder al almacenamiento documental privado.",
  STORAGE_INTEGRITY: "El objeto almacenado no coincide con su referencia de integridad.",
  STORAGE_PUBLIC_ACCESS: "El objeto de prueba admite acceso anónimo. No se deben habilitar cargas.",
  STORAGE_PRIVACY_UNVERIFIED: "No se pudo comprobar el bloqueo de acceso anónimo al objeto de prueba.",
  STORAGE_CLEANUP_FAILED: "No se pudo confirmar la eliminación del objeto de diagnóstico.",
  FILE_SIZE: "El archivo está vacío o supera el límite permitido.",
  FILE_REFERENCE: "La referencia interna del archivo no es válida.",
  ANTIVIRUS_UNAVAILABLE: "No se pudo completar el análisis antimalware. El archivo debe permanecer bloqueado.",
  ANTIVIRUS_PROTOCOL: "El analizador devolvió una respuesta inválida. El archivo debe permanecer bloqueado.",
  ANTIVIRUS_UNSAFE_ADDRESS: "El analizador TCP debe ser accesible por una dirección privada o loopback.",
  ANTIVIRUS_TEST_FAILED: "El analizador no produjo el resultado esperado en la prueba de seguridad.",
} as const;

export type DocumentFileErrorCode = keyof typeof messages;

/** Provider payloads, endpoints, keys and binary content must not become error messages. */
export class DocumentFileInfrastructureError extends Error {
  constructor(public readonly code: DocumentFileErrorCode, public readonly cleanupFailed = false) {
    super(messages[code]);
    this.name = "DocumentFileInfrastructureError";
  }
}
