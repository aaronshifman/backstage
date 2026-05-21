import {
  createFrontendPlugin,
  FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';

const entityCnpgCard = EntityCardBlueprint.make({
  name: 'cnpg-info',
  params: {
    filter: entity =>
      entity.kind === 'Resource' &&
      Boolean(entity.metadata.annotations?.['cnpg.io/cluster-name']),
    loader: () =>
      import('./components/EntityCnpgCard/EntityCnpgCard').then(m => (
        <m.EntityCnpgCard />
      )),
  },
});

export const k8SCnpgPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'k8s-cnpg',
  extensions: [entityCnpgCard],
});
