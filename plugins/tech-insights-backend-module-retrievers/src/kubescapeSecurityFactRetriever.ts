import { CatalogClient } from '@backstage/catalog-client';
import type { FactRetriever } from '@backstage-community/plugin-tech-insights-node';

export type KubescapeConfigScan = {
  controlResults: { passed: number; failed: number; skipped: number };
};
export type KubescapeVulnerability = {
  severities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    negligible: number;
  };
};

export type KubescapeFacts = {
  kubescapeFailedControls: number;
  kubescapeCriticalVulnerabilities: number;
};

export function aggregateKubescapeFacts(
  configScans: KubescapeConfigScan[],
  vulnerabilities: KubescapeVulnerability[],
): KubescapeFacts {
  const kubescapeFailedControls = configScans.reduce(
    (sum, s) => sum + (s.controlResults?.failed ?? 0),
    0,
  );
  const kubescapeCriticalVulnerabilities = vulnerabilities.reduce(
    (sum, v) => sum + (v.severities?.critical ?? 0),
    0,
  );
  return { kubescapeFailedControls, kubescapeCriticalVulnerabilities };
}

const NS_ANNOTATION = 'backstage.io/kubernetes-namespace';
const SELECTOR_ANNOTATION = 'backstage.io/kubernetes-label-selector';

async function fetchJson<T>(
  url: string,
  token: string,
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`kubescape request failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const kubescapeSecurityFactRetriever: FactRetriever = {
  id: 'kubescapeSecurityFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    kubescapeFailedControls: {
      type: 'integer',
      description: 'Number of failing Kubescape configuration-scan controls',
    },
    kubescapeCriticalVulnerabilities: {
      type: 'integer',
      description: 'Number of critical image vulnerabilities (Kubescape)',
    },
  },
  handler: async ctx => {
    const { discovery, auth, logger } = ctx;
    const catalog = new CatalogClient({ discoveryApi: discovery });

    const { token: catalogToken } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    const { token: kubescapeToken } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'kubescape',
    });
    const baseUrl = await discovery.getBaseUrl('kubescape');

    const { items } = await catalog.getEntities(
      { filter: [{ kind: 'Component' }] },
      { token: catalogToken },
    );

    const results = [];
    for (const entity of items) {
      const ann = entity.metadata.annotations ?? {};
      const namespace = ann[NS_ANNOTATION];
      const labelSelector = ann[SELECTOR_ANNOTATION];
      if (!namespace || !labelSelector) {
        continue; // not deployed to k8s via the standard annotations
      }
      const params = new URLSearchParams({ namespace, labelSelector });
      try {
        const [configScans, vulnerabilities] = await Promise.all([
          fetchJson<KubescapeConfigScan[]>(
            `${baseUrl}/configscans?${params}`,
            kubescapeToken,
          ),
          fetchJson<KubescapeVulnerability[]>(
            `${baseUrl}/vulnerabilities?${params}`,
            kubescapeToken,
          ),
        ]);
        if (configScans.length === 0) {
          continue; // no scan data for this workload set — skip rather than vacuously pass
        }
        results.push({
          entity: {
            namespace: entity.metadata.namespace ?? 'default',
            kind: entity.kind,
            name: entity.metadata.name,
          },
          facts: aggregateKubescapeFacts(configScans, vulnerabilities),
        });
      } catch (error) {
        logger.warn(
          `Kubescape fact retrieval skipped for ${entity.metadata.name}: ${error}`,
        );
      }
    }
    return results;
  },
};
