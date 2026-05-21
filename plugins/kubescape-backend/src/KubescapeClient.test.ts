import {
  mapSummaryToVulnerability,
  mapManifestMatchToCve,
  mapConfigScanToResult,
} from './KubescapeClient';

describe('mapSummaryToVulnerability', () => {
  it('maps severity counts from raw summary', () => {
    const summary = {
      metadata: {
        labels: {
          'kubescape.io/workload-name': 'myapp',
          'kubescape.io/workload-kind': 'deployment',
          'kubescape.io/workload-container-name': 'app',
        },
      },
      spec: {
        severities: {
          critical: { all: 2 },
          high: { all: 5 },
          medium: { all: 10 },
          low: { all: 3 },
          negligible: { all: 1 },
        },
      },
    };
    const result = mapSummaryToVulnerability(summary, 'myapp', 'deployment');
    expect(result.workloadName).toBe('myapp');
    expect(result.workloadKind).toBe('deployment');
    expect(result.containerName).toBe('app');
    expect(result.severities.critical).toBe(2);
    expect(result.severities.high).toBe(5);
    expect(result.severities.medium).toBe(10);
    expect(result.severities.low).toBe(3);
    expect(result.severities.negligible).toBe(1);
  });

  it('defaults missing severity counts to 0', () => {
    const summary = {
      metadata: { labels: {} },
      spec: { severities: {} },
    };
    const result = mapSummaryToVulnerability(summary, 'x', 'deployment');
    expect(result.severities.critical).toBe(0);
    expect(result.severities.high).toBe(0);
    expect(result.severities.medium).toBe(0);
    expect(result.severities.low).toBe(0);
    expect(result.severities.negligible).toBe(0);
  });
});

describe('mapManifestMatchToCve', () => {
  it('maps a manifest match to a CveEntry', () => {
    const match = {
      vulnerability: {
        id: 'CVE-2024-1234',
        severity: 'High',
        description: 'A buffer overflow',
        fix: { versions: ['1.2.3'] },
      },
      artifact: {
        name: 'openssl',
        version: '1.0.0',
      },
    };
    const result = mapManifestMatchToCve(match);
    expect(result.id).toBe('CVE-2024-1234');
    expect(result.severity).toBe('high');
    expect(result.title).toBe('A buffer overflow');
    expect(result.fixedVersion).toBe('1.2.3');
    expect(result.packageName).toBe('openssl');
    expect(result.packageVersion).toBe('1.0.0');
  });

  it('returns empty fixedVersion when fix.versions is null', () => {
    const match = {
      vulnerability: {
        id: 'CVE-2024-9999',
        severity: 'Low',
        description: '',
        fix: { versions: null },
      },
      artifact: { name: 'pkg', version: '0.1' },
    };
    const result = mapManifestMatchToCve(match);
    expect(result.fixedVersion).toBe('');
  });
});

describe('mapConfigScanToResult', () => {
  it('counts passed, failed, and skipped controls', () => {
    const scan = {
      spec: {
        controls: {
          'C-0001': { status: { status: 'passed' } },
          'C-0002': { status: { status: 'failed' } },
          'C-0003': { status: { status: 'skipped' } },
          'C-0004': { status: { status: 'passed' } },
        },
      },
    };
    const result = mapConfigScanToResult(scan, 'myapp', 'deployment');
    expect(result.workloadName).toBe('myapp');
    expect(result.workloadKind).toBe('deployment');
    expect(result.controlResults.passed).toBe(2);
    expect(result.controlResults.failed).toBe(1);
    expect(result.controlResults.skipped).toBe(1);
  });

  it('handles empty controls', () => {
    const scan = { spec: { controls: {} } };
    const result = mapConfigScanToResult(scan, 'x', 'deployment');
    expect(result.controlResults.passed).toBe(0);
    expect(result.controlResults.failed).toBe(0);
    expect(result.controlResults.skipped).toBe(0);
  });
});
