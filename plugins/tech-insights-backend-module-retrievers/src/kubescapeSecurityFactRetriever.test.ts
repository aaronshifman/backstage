import {
  aggregateKubescapeFacts,
  type KubescapeConfigScan,
  type KubescapeVulnerability,
} from './kubescapeSecurityFactRetriever';

function scan(failed: number): KubescapeConfigScan {
  return { controlResults: { passed: 10, failed, skipped: 0 } };
}

function vuln(critical: number, high: number): KubescapeVulnerability {
  return {
    severities: { critical, high, medium: 0, low: 0, negligible: 0 },
  };
}

describe('aggregateKubescapeFacts', () => {
  it('sums failed controls and critical vulnerabilities across workloads', () => {
    const facts = aggregateKubescapeFacts(
      [scan(2), scan(3)],
      [vuln(1, 4), vuln(0, 2)],
    );
    expect(facts).toEqual({
      kubescapeFailedControls: 5,
      kubescapeCriticalVulnerabilities: 1,
    });
  });

  it('reports zero for a clean workload set', () => {
    const facts = aggregateKubescapeFacts([scan(0)], [vuln(0, 0)]);
    expect(facts).toEqual({
      kubescapeFailedControls: 0,
      kubescapeCriticalVulnerabilities: 0,
    });
  });

  it('handles empty vulnerability data (config scans only)', () => {
    const facts = aggregateKubescapeFacts([scan(1)], []);
    expect(facts).toEqual({
      kubescapeFailedControls: 1,
      kubescapeCriticalVulnerabilities: 0,
    });
  });
});
