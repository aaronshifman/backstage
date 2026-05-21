import { SchedulerServiceTaskScheduleDefinitionConfig } from '@backstage/backend-plugin-api';

export interface Config {
  catalog?: {
    providers?: {
      /**
       * K8SCnpgProvider configuration.
       */
      k8SCnpgProvider?:
        | {
            /** Kubernetes API server URL */
            clusterUrl: string;
            /** Base64-encoded CA certificate data (mutually exclusive with caFile) */
            caData?: string;
            /** Path to a PEM CA certificate file (mutually exclusive with caData) */
            caFile?: string;
            /** ServiceAccount bearer token */
            token: string;
            /** Owner reference applied to all ingested Resource entities */
            owner: string;
            schedule?: SchedulerServiceTaskScheduleDefinitionConfig;
          }
        | {
            [name: string]: {
              clusterUrl: string;
              caData?: string;
              caFile?: string;
              token: string;
              owner: string;
              schedule?: SchedulerServiceTaskScheduleDefinitionConfig;
            };
          };
    };
  };
}
