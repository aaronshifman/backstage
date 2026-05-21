import { AppsV1Api } from '@kubernetes/client-node';
import {
  CrdClient,
  CrdClientConfig,
  CrdResource,
} from '@internal/backstage-plugin-k8s-crd-client-node';
import {
  WorkloadVulnerability,
  CveEntry,
  WorkloadConfigScan,
  FailingControl,
} from './types';
import { RawConfigScan, RawConfigScanSchema, RawManifest, RawManifestMatch, RawManifestSchema, RawSummary, RawSummarySchema } from './models';

const KUBESCAPE_GROUP = 'spdx.softwarecomposition.kubescape.io';
const KUBESCAPE_VERSION = 'v1beta1';

const VulnSummaryResource: CrdResource<RawSummary> = {
  group: KUBESCAPE_GROUP,
  version: KUBESCAPE_VERSION,
  plural: 'vulnerabilitymanifestsummaries',
  schema: RawSummarySchema,
};

const VulnManifestResource: CrdResource<RawManifest> = {
  group: KUBESCAPE_GROUP,
  version: KUBESCAPE_VERSION,
  plural: 'vulnerabilitymanifests',
  schema: RawManifestSchema,
};

const ConfigScanResource: CrdResource<RawConfigScan> = {
  group: KUBESCAPE_GROUP,
  version: KUBESCAPE_VERSION,
  plural: 'workloadconfigurationscansummaries',
  schema: RawConfigScanSchema,
};

export function mapSummaryToVulnerability(
  summary: RawSummary,
  workloadName: string,
  workloadKind: string,
): WorkloadVulnerability {
  const labels = summary.metadata?.labels ?? {};
  const annotations = summary.metadata?.annotations ?? {};
  const severities = summary.spec?.severities ?? {};
  const fullTag = annotations['kubescape.io/image-tag'] ?? '';
  const imageTag = fullTag ? fullTag.slice(fullTag.lastIndexOf('/') + 1) : '';
  return {
    workloadName,
    workloadKind,
    containerName: labels['kubescape.io/workload-container-name'] ?? '',
    imageTag,
    severities: {
      critical: severities.critical?.all ?? 0,
      high: severities.high?.all ?? 0,
      medium: severities.medium?.all ?? 0,
      low: severities.low?.all ?? 0,
      negligible: severities.negligible?.all ?? 0,
    },
  };
}

export function mapManifestMatchToCve(match: RawManifestMatch): CveEntry {
  const vuln = match.vulnerability ?? {};
  const artifact = match.artifact ?? {};
  return {
    id: vuln.id ?? '',
    severity: (vuln.severity ?? 'unknown').toLowerCase(),
    title: vuln.description ?? '',
    fixedVersion: vuln.fix?.versions?.[0] ?? '',
    packageName: artifact.name ?? '',
    packageVersion: artifact.version ?? '',
  };
}

export function mapConfigScanToResult(
  scan: RawConfigScan,
  workloadName: string,
  workloadKind: string,
): WorkloadConfigScan {
  const controls = scan.spec?.controls ?? {};
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const control of Object.values(controls)) {
    const status = control.status?.status?.toLowerCase();
    if (status === 'passed') passed++;
    else if (status === 'failed') failed++;
    else skipped++;
  }
  return {
    workloadName,
    workloadKind,
    controlResults: { passed, failed, skipped },
  };
}

export class KubescapeClient {
  private readonly crdClient: CrdClient;

  constructor(config: CrdClientConfig) {
    this.crdClient = new CrdClient(config);
  }

  private appsApi(): AppsV1Api {
    return this.crdClient.makeApiClient(AppsV1Api);
  }

  async getWorkloads(
    namespace: string,
    labelSelector: string,
  ): Promise<Array<{ name: string; kind: string }>> {
    const api = this.appsApi();
    const [deployments, statefulSets, daemonSets] = await Promise.all([
      api.listNamespacedDeployment({ namespace, labelSelector }),
      api.listNamespacedStatefulSet({ namespace, labelSelector }),
      api.listNamespacedDaemonSet({ namespace, labelSelector }),
    ]);
    return [
      ...(deployments.items ?? []).map(d => ({
        name: d.metadata?.name ?? '',
        kind: 'deployment',
      })),
      ...(statefulSets.items ?? []).map(s => ({
        name: s.metadata?.name ?? '',
        kind: 'statefulset',
      })),
      ...(daemonSets.items ?? []).map(d => ({
        name: d.metadata?.name ?? '',
        kind: 'daemonset',
      })),
    ].filter(w => w.name !== '');
  }

  async getVulnerabilities(
    namespace: string,
    labelSelector: string,
  ): Promise<WorkloadVulnerability[]> {
    const workloads = await this.getWorkloads(namespace, labelSelector);
    if (workloads.length === 0) return [];

    const workloadNames = new Set(workloads.map(w => w.name));
    const workloadKindMap = Object.fromEntries(
      workloads.map(w => [w.name, w.kind]),
    );

    const summaryAccessor = this.crdClient.resource(VulnSummaryResource);

    const allSummaries = await summaryAccessor.list({ namespace });
    const matchingNames = allSummaries
      .filter(s =>
        workloadNames.has(
          s.metadata?.labels?.['kubescape.io/workload-name'] ?? '',
        ),
      )
      .map(s => s.metadata?.name ?? '')
      .filter(Boolean);

    const results: WorkloadVulnerability[] = [];
    for (const summaryName of matchingNames) {
      const summary = await summaryAccessor.get({
        namespace,
        name: summaryName,
      });
      if (!summary) continue;
      const workloadName =
        summary.metadata?.labels?.['kubescape.io/workload-name'] ?? '';
      results.push(
        mapSummaryToVulnerability(
          summary,
          workloadName,
          workloadKindMap[workloadName] ?? '',
        ),
      );
    }
    return results;
  }

  async getCves(namespace: string, workloadName: string): Promise<CveEntry[]> {
    const summaryAccessor = this.crdClient.resource(VulnSummaryResource);
    const manifestAccessor = this.crdClient.resource(VulnManifestResource);

    const allSummaries = await summaryAccessor.list({ namespace });
    const summary = allSummaries.find(
      s => s.metadata?.labels?.['kubescape.io/workload-name'] === workloadName,
    );
    if (!summary) return [];

    const manifestName = summary.spec?.vulnerabilitiesRef?.all?.name;
    if (!manifestName) return [];

    const manifest = await manifestAccessor.get({
      namespace: 'kubescape',
      name: manifestName,
    });
    if (!manifest) return [];

    const matches = manifest.spec?.payload?.matches ?? [];
    return matches.map(mapManifestMatchToCve);
  }

  async getFailingControls(
    namespace: string,
    workloadKind: string,
    workloadName: string,
  ): Promise<FailingControl[]> {
    const scanName = `${workloadKind}-${workloadName}`;
    const scan = await this.crdClient.resource(ConfigScanResource).get({
      namespace,
      name: scanName,
    });
    if (!scan) return [];

    const controls = scan.spec?.controls ?? {};
    const results: FailingControl[] = [];
    for (const control of Object.values(controls)) {
      if (control.status?.status?.toLowerCase() !== 'failed') continue;
      results.push({
        controlID: control.controlID ?? '',
        severity: control.severity?.severity ?? 'unknown',
        scoreFactor: control.severity?.scoreFactor ?? 0,
        info: control.status?.info ?? '',
      });
    }
    return results.sort((a, b) => b.scoreFactor - a.scoreFactor);
  }

  async getConfigScans(
    namespace: string,
    labelSelector: string,
  ): Promise<WorkloadConfigScan[]> {
    const workloads = await this.getWorkloads(namespace, labelSelector);
    const accessor = this.crdClient.resource(ConfigScanResource);

    const results: WorkloadConfigScan[] = [];
    for (const workload of workloads) {
      const scanName = `${workload.kind}-${workload.name}`;
      const scan = await accessor.get({ namespace, name: scanName });
      if (!scan) continue;
      results.push(mapConfigScanToResult(scan, workload.name, workload.kind));
    }
    return results;
  }
}
