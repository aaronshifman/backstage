import { CatalogClient } from '@backstage/catalog-client';
import type { Entity } from '@backstage/catalog-model';
import type { FactRetriever } from '@backstage-community/plugin-tech-insights-node';

export type ComponentCompletenessFacts = {
  hasOwner: boolean;
  hasSystem: boolean;
  hasDescription: boolean;
  hasSourceLocation: boolean;
  hasTechdocs: boolean;
  gitopsWired: boolean;
};

export function computeComponentCompletenessFacts(
  entity: Entity,
): ComponentCompletenessFacts {
  const ann = entity.metadata.annotations ?? {};
  const spec = (entity.spec ?? {}) as { owner?: string; system?: string };

  const owner = spec.owner?.trim();
  const hasOwner = Boolean(owner) && owner !== 'unknown';
  const hasSystem = Boolean(spec.system?.trim());
  const hasDescription = Boolean(entity.metadata.description?.trim());
  const hasSourceLocation = Boolean(ann['backstage.io/source-location']);
  const hasTechdocs = Boolean(ann['backstage.io/techdocs-ref']);

  const hasArgocdApp = Boolean(
    ann['argocd/app-name'] || ann['argocd/app-selector'],
  );
  const hasK8sAnnotation = Boolean(
    ann['backstage.io/kubernetes-id'] ||
      ann['backstage.io/kubernetes-namespace'] ||
      ann['backstage.io/kubernetes-label-selector'],
  );

  return {
    hasOwner,
    hasSystem,
    hasDescription,
    hasSourceLocation,
    hasTechdocs,
    gitopsWired: hasArgocdApp && hasK8sAnnotation,
  };
}

export const componentCompletenessFactRetriever: FactRetriever = {
  id: 'componentCompletenessFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    hasOwner: { type: 'boolean', description: 'Has a non-unknown owner' },
    hasSystem: { type: 'boolean', description: 'Belongs to a System' },
    hasDescription: { type: 'boolean', description: 'Has a description' },
    hasSourceLocation: {
      type: 'boolean',
      description: 'Has a backstage.io/source-location annotation',
    },
    hasTechdocs: {
      type: 'boolean',
      description: 'Has a backstage.io/techdocs-ref annotation',
    },
    gitopsWired: {
      type: 'boolean',
      description: 'Has both an ArgoCD app and a Kubernetes annotation',
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
      { filter: [{ kind: 'Component' }] },
      { token },
    );
    return items.map(entity => ({
      entity: {
        namespace: entity.metadata.namespace ?? 'default',
        kind: entity.kind,
        name: entity.metadata.name,
      },
      facts: computeComponentCompletenessFacts(entity),
    }));
  },
};
