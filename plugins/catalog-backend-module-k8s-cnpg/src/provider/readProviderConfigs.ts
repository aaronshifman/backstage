import {
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
  SchedulerServiceTaskScheduleDefinition,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';

const DEFAULT_PROVIDER_ID = 'default';
const DEFAULT_SCHEDULE: SchedulerServiceTaskScheduleDefinition = {
  frequency: { minutes: 10 },
  timeout: { minutes: 2 },
};

export type K8SCnpgProviderConfig = {
  id: string;
  clusterUrl: string;
  caData?: string;
  caFile?: string;
  token: string;
  owner: string;
  schedule: SchedulerServiceTaskScheduleDefinition;
};

export function readProviderConfigs(config: Config): K8SCnpgProviderConfig[] {
  const providersConfig = config.getOptionalConfig(
    'catalog.providers.k8SCnpgProvider',
  );
  if (!providersConfig) {
    return [];
  }

  if (providersConfig.has('clusterUrl')) {
    return [readProviderConfig(DEFAULT_PROVIDER_ID, providersConfig)];
  }

  return providersConfig
    .keys()
    .map(id => readProviderConfig(id, providersConfig.getConfig(id)));
}

export function readProviderConfig(
  id: string,
  config: Config,
): K8SCnpgProviderConfig {
  const schedule = config.has('schedule')
    ? readSchedulerServiceTaskScheduleDefinitionFromConfig(
        config.getConfig('schedule'),
      )
    : DEFAULT_SCHEDULE;

  const caData = config.getOptionalString('caData');
  const caFile = config.getOptionalString('caFile');
  if (!caData && !caFile) {
    throw new Error(
      `k8SCnpgProvider config (id: ${id}) must specify either caData or caFile`,
    );
  }

  return {
    id,
    clusterUrl: config.getString('clusterUrl'),
    caData,
    caFile,
    token: config.getString('token'),
    owner: config.getString('owner'),
    schedule,
  };
}
