import {
  ApiBlueprint,
  createApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
  configApiRef,
} from '@backstage/frontend-plugin-api';
import {
  microsoftAuthApiRef,
  googleAuthApiRef,
} from '@backstage/core-plugin-api';
import type { OpenIdConnectApi } from '@backstage/core-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';
import {
  KubernetesAuthProviders,
  kubernetesAuthProvidersApiRef,
} from '@backstage/plugin-kubernetes-react';

const kubernetesOIDCAuthApiRef = createApiRef<OpenIdConnectApi>({
  id: 'internal.auth.kubernetes',
});

export const kubernetesAuthApiExtension = ApiBlueprint.make({
  name: 'kubernetes-oidc',
  params: defineParams =>
    defineParams({
      api: kubernetesOIDCAuthApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
        OAuth2.create({
          discoveryApi,
          oauthRequestApi,
          configApi,
          provider: {
            id: 'kubernetes-oidc', // matches backend providerId
            title: 'Kubernetes',
            icon: () => null,
          },
          environment: configApi.getOptionalString('auth.environment'),
          defaultScopes: ['openid', 'email', 'profile'],
        }),
    }),
});

export const kubeAuthExtension = ApiBlueprint.make({
  name: 'kube-auth-providers',
  params: defineParams =>
    defineParams({
      api: kubernetesAuthProvidersApiRef,
      deps: {
        kubernetesOIDCAuthApi: kubernetesOIDCAuthApiRef,
        microsoftAuthApi: microsoftAuthApiRef,
        googleAuthApi: googleAuthApiRef,
      },
      factory: ({ kubernetesOIDCAuthApi, microsoftAuthApi, googleAuthApi }) =>
        new KubernetesAuthProviders({
          microsoftAuthApi,
          googleAuthApi,
          oidcProviders: {
            kubernetes: kubernetesOIDCAuthApi, // matches oidcTokenProvider in config
          },
        }),
    }),
});
