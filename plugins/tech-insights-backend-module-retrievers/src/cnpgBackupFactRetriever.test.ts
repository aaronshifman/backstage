import type { Entity } from '@backstage/catalog-model';
import { computeCnpgBackupFacts } from './cnpgBackupFactRetriever';

const NOW = new Date('2026-08-04T12:00:00Z');

function cnpgResource(annotations: Record<string, string>): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Resource',
    metadata: { name: 'mydb--production', annotations },
    spec: { type: 'database', owner: 'group:default/platform' },
  } as Entity;
}

describe('computeCnpgBackupFacts', () => {
  it('reports a healthy, recently-backed-up cluster as all-good', () => {
    const facts = computeCnpgBackupFacts(
      cnpgResource({
        'cnpg.io/cluster-name': 'mydb',
        'cnpg.io/continuous-archiving': 'True',
        'cnpg.io/backup-status': 'True',
        'cnpg.io/last-backup-time': '2026-08-04T10:00:00Z', // 2h before NOW
      }),
      NOW,
    );
    expect(facts).toEqual({
      walArchivingEnabled: true,
      backupConfigured: true,
      backupSucceeded: true,
      hoursSinceLastBackup: 2,
    });
  });

  it('flags a stale backup (older than 24h)', () => {
    const facts = computeCnpgBackupFacts(
      cnpgResource({
        'cnpg.io/cluster-name': 'mydb',
        'cnpg.io/continuous-archiving': 'True',
        'cnpg.io/backup-status': 'True',
        'cnpg.io/last-backup-time': '2026-08-03T00:00:00Z', // 36h before NOW
      }),
      NOW,
    );
    expect(facts.hoursSinceLastBackup).toBe(36);
    expect(facts.backupSucceeded).toBe(true);
  });

  it('treats a missing last-backup-time as effectively infinite age', () => {
    const facts = computeCnpgBackupFacts(
      cnpgResource({
        'cnpg.io/cluster-name': 'mydb',
        'cnpg.io/continuous-archiving': 'False',
        'cnpg.io/backup-status': '',
      }),
      NOW,
    );
    expect(facts.walArchivingEnabled).toBe(false);
    expect(facts.backupConfigured).toBe(false);
    expect(facts.backupSucceeded).toBe(false);
    expect(facts.hoursSinceLastBackup).toBeGreaterThan(24 * 365);
  });

  it('does not treat WAL archiving alone as backupConfigured', () => {
    const facts = computeCnpgBackupFacts(
      cnpgResource({
        'cnpg.io/cluster-name': 'mydb',
        'cnpg.io/continuous-archiving': 'True',
        'cnpg.io/backup-status': '',
      }),
      NOW,
    );
    // WAL archiving is a distinct concern (its own check); it does not imply a
    // configured backup.
    expect(facts.walArchivingEnabled).toBe(true);
    expect(facts.backupConfigured).toBe(false);
  });
});
