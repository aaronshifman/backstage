import { ConfigReader } from '@backstage/config';
import { readKubescapeConfig } from './config';

describe('readKubescapeConfig', () => {
  it('reads all required fields', () => {
    const config = new ConfigReader({
      kubescape: {
        clusterUrl: 'https://192.168.2.21:6443',
        caData: 'base64encodedCA==',
        token: 'mytoken',
      },
    });
    const result = readKubescapeConfig(config);
    expect(result.clusterUrl).toBe('https://192.168.2.21:6443');
    expect(result.caData).toBe('base64encodedCA==');
    expect(result.token).toBe('mytoken');
  });

  it('throws when kubescape config is missing', () => {
    const config = new ConfigReader({});
    expect(() => readKubescapeConfig(config)).toThrow();
  });
});
