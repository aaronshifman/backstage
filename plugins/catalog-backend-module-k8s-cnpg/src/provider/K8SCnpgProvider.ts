import { Config } from '@backstage/config';
import {
  DeferredEntity,
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import * as uuid from 'uuid';
import {
  readProviderConfigs,
  K8SCnpgProviderConfig,
} from './readProviderConfigs';
import {
  LoggerService,
  SchedulerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import {
  CrdClient,
  type CrdResource,
  type ResourceAccessor,
} from '@internal/backstage-plugin-k8s-crd-client-node';
import {
  CnpgClusterSchema,
  type CnpgCluster,
} from '../generated/CnpgClusterSchema';

const CnpgClusterResource: CrdResource<CnpgCluster> = {
  group: 'postgresql.cnpg.io',
  version: 'v1',
  plural: 'clusters',
  schema: CnpgClusterSchema,
};

export function mapClusterToEntity(
  cluster: CnpgCluster,
  owner: string,
): DeferredEntity {
  const name = cluster.metadata.name ?? 'unknown';
  const namespace = cluster.metadata.namespace ?? 'default';
  const status = cluster.status;

  const pgVersion = String(status?.pgDataImageInfo?.majorVersion ?? '');
  const instances = String(status?.instances ?? '');
  const archiving = status?.conditions?.find(
    c => c.type === 'ContinuousArchiving',
  );
  const backup = status?.conditions?.find(
    c => c.type === 'LastBackupSucceeded',
  );
  const archivingEnabled = archiving?.status === 'True';
  const backupOk = backup?.status === 'True';

  const entityName = `${name}--${namespace}`;

  const descParts = [
    pgVersion ? `PostgreSQL ${pgVersion}` : null,
    instances ? `${instances} instances` : null,
    `Namespace: ${namespace}`,
    archiving
      ? `Archiving: ${archivingEnabled ? 'enabled' : 'disabled'}`
      : null,
  ].filter(Boolean);

  return {
    locationKey: 'cnpg-provider',
    entity: {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Resource',
      metadata: {
        name: entityName,
        description: descParts.join(' | '),
        labels: {
          ...(pgVersion && { 'cnpg-pg-version': pgVersion }),
          ...(instances && { 'cnpg-instances': instances }),
          ...(archiving && { 'cnpg-archiving': String(archivingEnabled) }),
          ...(backup && { 'cnpg-backup': String(backupOk) }),
        },
        annotations: {
          'backstage.io/managed-by-location': `cnpg-provider:${entityName}`,
          'backstage.io/managed-by-origin-location': `cnpg-provider:${entityName}`,
          'cnpg.io/cluster-name': name,
          'cnpg.io/namespace': namespace,
          'cnpg.io/cluster-status': status?.phase ?? '',
          'cnpg.io/instances': instances,
          'cnpg.io/pg-version': pgVersion,
          'cnpg.io/backup-status': backup?.status ?? '',
          'cnpg.io/last-backup-time': backup?.lastTransitionTime ?? '',
          'cnpg.io/continuous-archiving': archiving?.status ?? '',
          'cnpg.io/continuous-archiving-reason': archiving?.reason ?? '',
          'cnpg.io/last-archive-time': archiving?.lastTransitionTime ?? '',
          'backstage.io/kubernetes-namespace': namespace,
          'backstage.io/kubernetes-label-selector': `cnpg.io/cluster=${name}`,
        },
      },
      spec: {
        type: 'database',
        lifecycle: 'production',
        owner,
      },
    },
  };
}

export type K8SCnpgProviderOptions = {
  logger: LoggerService;
  scheduler: SchedulerService;
};

export class K8SCnpgProvider implements EntityProvider {
  static fromConfig(
    configRoot: Config,
    options: K8SCnpgProviderOptions,
  ): K8SCnpgProvider[] {
    return readProviderConfigs(configRoot).map(
      providerConfig =>
        new K8SCnpgProvider({
          ...providerConfig,
          logger: options.logger,
          taskRunner: options.scheduler.createScheduledTaskRunner(
            providerConfig.schedule,
          ),
        }),
    );
  }

  private readonly id: string;
  private readonly clusterUrl: string;
  private readonly owner: string;
  private readonly logger: LoggerService;
  private readonly taskRunner: SchedulerServiceTaskRunner;
  private readonly accessor: ResourceAccessor<CnpgCluster>;

  constructor(
    options: K8SCnpgProviderConfig & {
      logger: LoggerService;
      taskRunner: SchedulerServiceTaskRunner;
    },
  ) {
    this.id = options.id;
    this.clusterUrl = options.clusterUrl;
    this.owner = options.owner;
    this.logger = options.logger;
    this.taskRunner = options.taskRunner;
    this.accessor = new CrdClient({
      clusterUrl: options.clusterUrl,
      caData: options.caData,
      caFile: options.caFile,
      token: options.token,
    }).resource(CnpgClusterResource);
  }

  getProviderName() {
    return `K8SCnpgProvider:${this.id}`;
  }

  async connect(connection: EntityProviderConnection) {
    const id = `${this.getProviderName()}:refresh`;

    await this.taskRunner.run({
      id,
      fn: async () => {
        const logger = this.logger.child({
          taskId: id,
          taskInstanceId: uuid.v4(),
        });

        try {
          const entities = await this.read({ logger });
          logger.info(`Read ${entities.length} CNPG clusters`);
          await connection.applyMutation({ type: 'full', entities });
        } catch (error) {
          logger.error(`CNPG refresh failed`, error as Error);
        }
      },
    });
  }

  async read(options: { logger: LoggerService }): Promise<DeferredEntity[]> {
    const { logger } = options;
    logger.info(`Fetching CNPG clusters from ${this.clusterUrl}`);

    const items = await this.accessor.listCluster();
    return items.map(cluster => mapClusterToEntity(cluster, this.owner));
  }
}
