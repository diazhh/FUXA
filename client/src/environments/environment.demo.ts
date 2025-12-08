declare function require(moduleName: string): any;
export const environment = {
  version: require('../../package.json').version,
  production: true,
  apiEndpoint: null,
  apiPort: 1887,
  serverEnabled: false,
  type: 'demo'
};
