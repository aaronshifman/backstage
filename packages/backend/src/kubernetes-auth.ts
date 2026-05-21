import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { oidcAuthenticator } from '@backstage/plugin-auth-backend-module-oidc-provider';

export const kubernetesOidcAuthModule = createBackendModule({
  pluginId: 'auth',
  moduleId: 'kubernetes-oidc',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'kubernetes-oidc',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
          }),
        });
      },
    });
  },
});

export default kubernetesOidcAuthModule;
