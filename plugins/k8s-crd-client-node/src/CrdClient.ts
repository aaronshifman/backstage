import {
  KubeConfig,
  CustomObjectsApi,
  ApiException,
} from '@kubernetes/client-node';
import { z } from 'zod';

export class CrdValidationError extends Error {
  constructor(
    public readonly coordinates: {
      group: string;
      version: string;
      plural: string;
      name?: string;
    },
    public readonly cause: z.ZodError,
  ) {
    super(`CRD response from ${coordinates.plural} failed validation`, {
      cause,
    });
    this.name = 'CrdValidationError';
  }
}

export type CrdClientConfig = {
  clusterUrl: string;
  caData?: string;
  caFile?: string;
  token: string;
};

export type CrdResource<T> = {
  group: string;
  version: string;
  plural: string;
  schema: z.ZodSchema<T>;
};

export type ResourceAccessor<T> = {
  get(opts: { namespace: string; name: string }): Promise<T | null>;
  list(opts: { namespace: string; labelSelector?: string }): Promise<T[]>;
  listCluster(opts?: { labelSelector?: string }): Promise<T[]>;
};

function is404(error: unknown): error is ApiException<unknown> {
  return error instanceof ApiException && error.code === 404;
}

class ResourceAccessorImpl<T> implements ResourceAccessor<T> {
  private readonly group: string;
  private readonly version: string;
  private readonly plural: string;
  private readonly schema: z.ZodSchema<T>;

  constructor(
    private readonly api: CustomObjectsApi,
    descriptor: CrdResource<T>,
  ) {
    this.group = descriptor.group;
    this.version = descriptor.version;
    this.plural = descriptor.plural;
    this.schema = descriptor.schema;
  }

  private parse(raw: unknown, name?: string): T {
    const result = this.schema.safeParse(raw);
    if (!result.success) {
      throw new CrdValidationError(
        { group: this.group, version: this.version, plural: this.plural, name },
        result.error,
      );
    }
    return result.data;
  }

  async get(opts: { namespace: string; name: string }): Promise<T | null> {
    try {
      const raw = await this.api.getNamespacedCustomObject({
        group: this.group,
        version: this.version,
        namespace: opts.namespace,
        plural: this.plural,
        name: opts.name,
      });
      return this.parse(raw, opts.name);
    } catch (error) {
      if (is404(error)) return null;
      throw error;
    }
  }

  async list(opts: {
    namespace: string;
    labelSelector?: string;
  }): Promise<T[]> {
    try {
      const raw = await this.api.listNamespacedCustomObject({
        group: this.group,
        version: this.version,
        namespace: opts.namespace,
        plural: this.plural,
        ...(opts.labelSelector ? { labelSelector: opts.labelSelector } : {}),
      });
      const items: unknown[] = (raw as any).items ?? [];
      return items.map(item => this.parse(item));
    } catch (error) {
      if (is404(error)) return [];
      throw error;
    }
  }

  async listCluster(opts?: { labelSelector?: string }): Promise<T[]> {
    try {
      const raw = await this.api.listClusterCustomObject({
        group: this.group,
        version: this.version,
        plural: this.plural,
        ...(opts?.labelSelector ? { labelSelector: opts.labelSelector } : {}),
      });
      const items: unknown[] = (raw as any).items ?? [];
      return items.map(item => this.parse(item));
    } catch (error) {
      if (is404(error)) return [];
      throw error;
    }
  }
}

export class CrdClient {
  private readonly kc: KubeConfig;
  private readonly api: CustomObjectsApi;

  constructor(config: CrdClientConfig) {
    this.kc = new KubeConfig();
    this.kc.loadFromOptions({
      clusters: [
        {
          name: 'cluster',
          server: config.clusterUrl,
          caData: config.caData,
          caFile: config.caFile,
          skipTLSVerify: false,
        },
      ],
      users: [{ name: 'backstage', token: config.token }],
      contexts: [{ name: 'ctx', cluster: 'cluster', user: 'backstage' }],
      currentContext: 'ctx',
    });
    this.api = this.kc.makeApiClient(CustomObjectsApi);
  }

  makeApiClient<T>(apiClientType: new (...args: any[]) => T): T {
    return this.kc.makeApiClient(apiClientType as any) as T;
  }

  resource<T>(descriptor: CrdResource<T>): ResourceAccessor<T> {
    return new ResourceAccessorImpl(this.api, descriptor);
  }
}
