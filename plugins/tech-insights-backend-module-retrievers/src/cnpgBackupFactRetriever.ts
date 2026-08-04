import { CatalogClient } from '@backstage/catalog-client';
import type { Entity } from '@backstage/catalog-model';
import type { FactRetriever } from '@backstage-community/plugin-tech-insights-node';

export type CnpgBackupFacts = {
  walArchivingEnabled: boolean;
  backupConfigured: boolean;
  backupSucceeded: boolean;
  hoursSinceLastBackup: number;
};

const CNPG_MARKER_ANNOTATION = 'cnpg.io/cluster-name';
// Sentinel used when there is no valid last-backup timestamp, so the
// "backup within 24h" check reliably fails. ~114 years in hours.
const NO_BACKUP_HOURS = 1_000_000;

export function computeCnpgBackupFacts(
  entity: Entity,
  now: Date = new Date(),
): CnpgBackupFacts {
  const ann = entity.metadata.annotations ?? {};

  const walArchivingEnabled = ann['cnpg.io/continuous-archiving'] === 'True';
  const backupSucceeded = ann['cnpg.io/backup-status'] === 'True';
  const backupConfigured = Boolean(ann['cnpg.io/backup-status']);

  const lastBackup = ann['cnpg.io/last-backup-time'];
  const parsed = lastBackup ? Date.parse(lastBackup) : NaN;
  const hoursSinceLastBackup = Number.isNaN(parsed)
    ? NO_BACKUP_HOURS
    : Math.max(0, Math.floor((now.getTime() - parsed) / 3_600_000));

  return {
    walArchivingEnabled,
    backupConfigured,
    backupSucceeded,
    hoursSinceLastBackup,
  };
}

export const cnpgBackupFactRetriever: FactRetriever = {
  id: 'cnpgBackupFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'resource' }],
  schema: {
    walArchivingEnabled: {
      type: 'boolean',
      description: 'CNPG continuous WAL archiving is active',
    },
    backupConfigured: {
      type: 'boolean',
      description: 'A backup is configured (a backup status is reported)',
    },
    backupSucceeded: {
      type: 'boolean',
      description: 'The last backup succeeded',
    },
    hoursSinceLastBackup: {
      type: 'integer',
      description: 'Whole hours since the last successful backup',
    },
  },
  handler: async ctx => {
    const { discovery, auth } = ctx;
    const catalog = new CatalogClient({ discoveryApi: discovery });
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    const { items } = await catalog.getEntities(
      { filter: [{ kind: 'Resource' }] },
      { token },
    );
    return items
      .filter(entity =>
        Boolean(entity.metadata.annotations?.[CNPG_MARKER_ANNOTATION]),
      )
      .map(entity => ({
        entity: {
          namespace: entity.metadata.namespace ?? 'default',
          kind: entity.kind,
          name: entity.metadata.name,
        },
        facts: computeCnpgBackupFacts(entity),
      }));
  },
};
