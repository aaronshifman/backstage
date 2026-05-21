import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import k8sCnpgPlugin from '@internal/backstage-plugin-k8s-cnpg';
import kubescapeFrontendPlugin from '@internal/backstage-plugin-kubescape';
import { navModule } from './modules/nav';
import { convertLegacyPlugin } from '@backstage/core-compat-api';
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import {
  convertLegacyEntityCardExtension,
  convertLegacyEntityContentExtension,
} from '@backstage/plugin-catalog-react/alpha';
import {
  argocdPlugin,
  ArgocdDeploymentSummary,
  ArgocdDeploymentLifecycle,
  isArgocdConfigured,
} from '@backstage-community/plugin-argocd';

const argocdFrontendPlugin = convertLegacyPlugin(argocdPlugin, {
  extensions: [
    convertLegacyEntityCardExtension(ArgocdDeploymentSummary, {
      name: 'argocd-deployment-summary',
      filter: e => Boolean(isArgocdConfigured(e)),
    }),
    convertLegacyEntityContentExtension(ArgocdDeploymentLifecycle, {
      name: 'argocd-deployment-lifecycle',
      filter: e => Boolean(isArgocdConfigured(e)),
      path: 'argocd',
      title: 'ArgoCD',
    }),
  ],
});

import {
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import {
  createApiRef,
  createFrontendModule,
  configApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
  ApiBlueprint,
} from '@backstage/frontend-plugin-api';
import { kubeAuthExtension, kubernetesAuthApiExtension } from './apis';

const keycloakAuthApiRef = createApiRef<
  OpenIdConnectApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
>().with({
  id: 'auth.keycloak',
});

const keycloakAuthApi = ApiBlueprint.make({
  name: 'keycloak',
  params: defineParams =>
    defineParams({
      api: keycloakAuthApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
        OAuth2.create({
          configApi,
          discoveryApi,
          oauthRequestApi,
          environment: configApi.getOptionalString('auth.environment'),
          provider: {
            id: 'oidc',
            title: 'Keycloak',
            icon: () => null,
          },
          defaultScopes: ['openid', 'profile', 'email'],
        }),
    }),
});

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props =>
      (
        <SignInPage
          {...props}
          provider={{
            id: 'keycloak-auth-provider',
            title: 'Keycloak',
            message: 'Sign In using Keycloak',
            apiRef: keycloakAuthApiRef,
          }}
        />
      ),
  },
});

export default createApp({
  features: [
    catalogPlugin,
    argocdFrontendPlugin,
    k8sCnpgPlugin,
    kubescapeFrontendPlugin,
    navModule,
    githubActionsPlugin,
    createFrontendModule({
      pluginId: 'app',
      extensions: [keycloakAuthApi, signInPage],
    }),
    createFrontendModule({
      pluginId: 'kubernetes',
      extensions: [kubernetesAuthApiExtension, kubeAuthExtension],
    }),
  ],
});
