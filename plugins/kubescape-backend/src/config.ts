import { Config } from '@backstage/config';
import { CrdClientConfig } from '@internal/backstage-plugin-k8s-crd-client-node';

export function readKubescapeConfig(config: Config): CrdClientConfig {
  const c = config.getConfig('kubescape');
  const caData = c.getOptionalString('caData');
  const caFile = c.getOptionalString('caFile');
  if (!caData && !caFile) {
    throw new Error('kubescape config must specify either caData or caFile');
  }
  return {
    clusterUrl: c.getString('clusterUrl'),
    caData,
    caFile,
    token: c.getString('token'),
  };
}
