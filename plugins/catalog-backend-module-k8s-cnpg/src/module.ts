import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { K8SCnpgProvider } from './provider/K8SCnpgProvider';

export const catalogModuleK8SCnpg = createBackendModule({
  moduleId: 'k8s-cnpg-provider',
  pluginId: 'catalog',
  register({ registerInit }) {
    registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        processing: catalogProcessingExtensionPoint,
      },
      async init({ logger, scheduler, config, processing }) {
        processing.addEntityProvider(
          K8SCnpgProvider.fromConfig(config, {
            logger,
            scheduler,
          }),
        );
      },
    });
  },
});
