const S = '^backend/src/';
module.exports = { forbidden: [
  { name: 'domain-puro', severity: 'error', from: { path: S + 'domain' }, to: { pathNot: S + 'domain' } },
  { name: 'application-solo-domain', severity: 'error', from: { path: S + 'application' }, to: { pathNot: S + '(application|domain)' } },
  { name: 'interfaces-sin-infra', severity: 'error', from: { path: S + 'interfaces' }, to: { path: S + '(infrastructure|main)' } },
  { name: 'infra-sin-interfaces', severity: 'error', from: { path: S + 'infrastructure' }, to: { path: S + '(interfaces|main)' } },
  { name: 'solo-main-cablea', severity: 'error', from: { pathNot: S + 'main' }, to: { path: S + 'main' } },
  { name: 'src-sin-tests', severity: 'error', from: { path: '^backend/src' }, to: { path: '^backend/tests' } },
  { name: 'sin-ciclos', severity: 'error', from: {}, to: { circular: true } },
  { name: 'sin-irresolubles', severity: 'error', from: {}, to: { couldNotResolve: true } },
], options: { tsPreCompilationDeps: true, doNotFollow: { path: 'node_modules' },
              tsConfig: { fileName: 'backend/tsconfig.json' } } };
