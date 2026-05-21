import { Entity } from '@backstage/catalog-model';
import {
  createFrontendPlugin,
  FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';

const hasKubernetesAnnotations = (entity: Entity) =>
  Boolean(
    entity.metadata?.annotations?.['backstage.io/kubernetes-namespace'],
  ) &&
  Boolean(
    entity.metadata?.annotations?.['backstage.io/kubernetes-label-selector'],
  );

const entityKubescapeVulnCard = EntityCardBlueprint.make({
  name: 'kubescape-vuln',
  params: {
    filter: hasKubernetesAnnotations,
    loader: () =>
      import(
        './components/EntityKubescapeVulnCard/EntityKubescapeVulnCard'
      ).then(m => <m.EntityKubescapeVulnCard />),
  },
});

const entityKubescapeConfigCard = EntityCardBlueprint.make({
  name: 'kubescape-config',
  params: {
    filter: hasKubernetesAnnotations,
    loader: () =>
      import(
        './components/EntityKubescapeConfigCard/EntityKubescapeConfigCard'
      ).then(m => <m.EntityKubescapeConfigCard />),
  },
});

export const kubescapeFrontendPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'kubescape',
  extensions: [entityKubescapeVulnCard, entityKubescapeConfigCard],
});
