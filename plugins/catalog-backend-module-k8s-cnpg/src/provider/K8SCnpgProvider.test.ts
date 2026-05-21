import { mapClusterToEntity } from './K8SCnpgProvider';
import type { CnpgCluster } from '../generated/CnpgClusterSchema';

const sampleCluster = {
  metadata: { name: 'mydb', namespace: 'production' },
  status: {
    phase: 'Cluster in healthy state',
    instances: 3,
    pgDataImageInfo: { majorVersion: 17 },
    conditions: [
      {
        type: 'ContinuousArchiving',
        status: 'True',
        reason: 'ContinuousArchivingSucceeding',
        lastTransitionTime: '2026-05-23T00:05:00Z',
      },
      {
        type: 'LastBackupSucceeded',
        status: 'True',
        reason: 'LastBackupSucceeded',
        lastTransitionTime: '2026-05-23T00:01:47Z',
      },
    ],
  },
} as unknown as CnpgCluster;

describe('mapClusterToEntity', () => {
  it('creates entity name from cluster name and namespace', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(deferred.entity.metadata.name).toBe('mydb--production');
  });

  it('sets kind Resource with type database', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(deferred.entity.kind).toBe('Resource');
    expect((deferred.entity as any).spec?.type).toBe('database');
  });

  it('sets the configured owner', () => {
    const deferred = mapClusterToEntity(sampleCluster, 'group:default/ops');
    expect((deferred.entity as any).spec?.owner).toBe('group:default/ops');
  });

  it('reads pg version from pgDataImageInfo.majorVersion', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(deferred.entity.metadata.annotations!['cnpg.io/pg-version']).toBe(
      '17',
    );
  });

  it('maps all CNPG annotations', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    const a = deferred.entity.metadata.annotations!;
    expect(a['cnpg.io/cluster-name']).toBe('mydb');
    expect(a['cnpg.io/namespace']).toBe('production');
    expect(a['cnpg.io/cluster-status']).toBe('Cluster in healthy state');
    expect(a['cnpg.io/instances']).toBe('3');
    expect(a['cnpg.io/backup-status']).toBe('True');
    expect(a['cnpg.io/continuous-archiving']).toBe('True');
    expect(a['cnpg.io/continuous-archiving-reason']).toBe(
      'ContinuousArchivingSucceeding',
    );
    expect(a['cnpg.io/last-backup-time']).toBe('2026-05-23T00:01:47Z');
    expect(a['cnpg.io/last-archive-time']).toBe('2026-05-23T00:05:00Z');
  });

  it('sets labels for UI visibility', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    const l = deferred.entity.metadata.labels!;
    expect(l['cnpg-pg-version']).toBe('17');
    expect(l['cnpg-instances']).toBe('3');
    expect(l['cnpg-archiving']).toBe('true');
    expect(l['cnpg-backup']).toBe('true');
  });

  it('sets a human-readable description', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(deferred.entity.metadata.description).toContain('PostgreSQL 17');
    expect(deferred.entity.metadata.description).toContain('3 instances');
  });

  it('handles missing status gracefully', () => {
    const cluster = { metadata: { name: 'bare', namespace: 'default' } } as unknown as CnpgCluster;
    const deferred = mapClusterToEntity(cluster, 'group:default/platform');
    expect(deferred.entity.metadata.name).toBe('bare--default');
    expect(deferred.entity.kind).toBe('Resource');
  });

  it('emits backstage.io/kubernetes-namespace annotation', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(
      deferred.entity.metadata.annotations![
        'backstage.io/kubernetes-namespace'
      ],
    ).toBe('production');
  });

  it('emits backstage.io/kubernetes-label-selector annotation', () => {
    const deferred = mapClusterToEntity(
      sampleCluster,
      'group:default/platform',
    );
    expect(
      deferred.entity.metadata.annotations![
        'backstage.io/kubernetes-label-selector'
      ],
    ).toBe('cnpg.io/cluster=mydb');
  });
});
