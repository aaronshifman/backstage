import { createBackendModule } from '@backstage/backend-plugin-api';
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { componentCompletenessFactRetriever } from './componentCompletenessFactRetriever';

export const techInsightsModuleRetrievers = createBackendModule({
  pluginId: 'tech-insights',
  moduleId: 'retrievers',
  register(reg) {
    reg.registerInit({
      deps: { providers: techInsightsFactRetrieversExtensionPoint },
      async init({ providers }) {
        providers.addFactRetrievers({ componentCompletenessFactRetriever });
      },
    });
  },
});
