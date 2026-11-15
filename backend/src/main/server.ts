import { loadEnv } from '../infrastructure/config/env.js';

// Stub de S1.1: solo valida la configuración. Express llega en S2.1.
try {
  loadEnv();
  console.log('Configuración válida.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuración inválida.');
  process.exit(1);
}
