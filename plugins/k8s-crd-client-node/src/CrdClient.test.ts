import { z } from 'zod';
import { CrdClient, CrdValidationError, CrdResource } from './CrdClient';

// ---------------------------------------------------------------------------
// CrdValidationError tests (kept from Task 2)
// ---------------------------------------------------------------------------

describe('CrdValidationError', () => {
  it('is an instance of Error', () => {
    const zodError = new z.ZodError([]);
    const err = new CrdValidationError(
      { group: 'test.io', version: 'v1', plural: 'tests' },
      zodError,
    );
    expect(err).toBeInstanceOf(Error);
  });

  it('message includes the plural resource name', () => {
    const zodError = new z.ZodError([]);
    const err = new CrdValidationError(
      { group: 'test.io', version: 'v1', plural: 'widgets' },
      zodError,
    );
    expect(err.message).toContain('widgets');
  });

  it('exposes coordinates and cause', () => {
    const zodError = new z.ZodError([]);
    const coords = {
      group: 'test.io',
      version: 'v1',
      plural: 'things',
      name: 'my-thing',
    };
    const err = new CrdValidationError(coords, zodError);
    expect(err.coordinates).toEqual(coords);
    expect(err.cause).toBe(zodError);
  });
});

// ---------------------------------------------------------------------------
// Mock @kubernetes/client-node
// The factory runs when the module is first loaded; mocks are stored on the
// module export so tests can access them via jest.requireMock.
// ---------------------------------------------------------------------------
jest.mock('@kubernetes/client-node', () => {
  class ApiException extends Error {
    code: number;
    body: unknown;
    headers: Record<string, string>;
    constructor(
      code: number,
      message: string,
      body: unknown,
      headers: Record<string, string> = {},
    ) {
      super(message);
      this.code = code;
      this.body = body;
      this.headers = headers;
    }
  }

  const mockGet = jest.fn();
  const mockList = jest.fn();
  const mockListCluster = jest.fn();
  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      loadFromOptions: jest.fn(),
      makeApiClient: jest.fn().mockReturnValue({
        getNamespacedCustomObject: mockGet,
        listNamespacedCustomObject: mockList,
        listClusterCustomObject: mockListCluster,
      }),
    })),
    CustomObjectsApi: jest.fn(),
    ApiException,
    _mocks: { mockGet, mockList, mockListCluster },
  };
});

function getMocks() {
  return (jest.requireMock('@kubernetes/client-node') as any)._mocks as {
    mockGet: jest.Mock;
    mockList: jest.Mock;
    mockListCluster: jest.Mock;
  };
}

function make404(): unknown {
  const { ApiException } = jest.requireMock('@kubernetes/client-node') as any;
  return new ApiException(404, 'Not Found', {});
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const TestSchema = z.object({
  metadata: z.object({ name: z.string() }),
  value: z.number(),
});
type TestItem = z.infer<typeof TestSchema>;

const TestResource: CrdResource<TestItem> = {
  group: 'test.io',
  version: 'v1',
  plural: 'tests',
  schema: TestSchema,
};

const validConfig = {
  clusterUrl: 'https://k8s.example.com',
  caData: 'dGVzdA==',
  token: 'my-token',
};

beforeEach(() => {
  const { mockGet, mockList, mockListCluster } = getMocks();
  mockGet.mockReset();
  mockList.mockReset();
  mockListCluster.mockReset();
});

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------
describe('ResourceAccessor.get', () => {
  it('returns typed object on success', async () => {
    const { mockGet } = getMocks();
    const raw = { metadata: { name: 'foo' }, value: 42 };
    mockGet.mockResolvedValue(raw);

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.get({ namespace: 'default', name: 'foo' });

    expect(result).toEqual(raw);
  });

  it('returns null on 404', async () => {
    const { mockGet } = getMocks();
    mockGet.mockRejectedValue(make404());

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.get({
      namespace: 'default',
      name: 'missing',
    });

    expect(result).toBeNull();
  });

  it('throws on non-404 HTTP error', async () => {
    const { mockGet } = getMocks();
    const err = new Error('unauthorized');
    (err as any).code = 401;
    mockGet.mockRejectedValue(err);

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await expect(
      accessor.get({ namespace: 'default', name: 'x' }),
    ).rejects.toThrow('unauthorized');
  });

  it('throws CrdValidationError when response fails schema', async () => {
    const { mockGet } = getMocks();
    mockGet.mockResolvedValue({
      metadata: { name: 'foo' },
      value: 'not-a-number',
    });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await expect(
      accessor.get({ namespace: 'default', name: 'foo' }),
    ).rejects.toBeInstanceOf(CrdValidationError);
  });

  it('CrdValidationError includes correct coordinates', async () => {
    const { mockGet } = getMocks();
    mockGet.mockResolvedValue({ metadata: { name: 'foo' }, value: 'bad' });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    let caught: CrdValidationError | undefined;
    try {
      await accessor.get({ namespace: 'default', name: 'foo' });
    } catch (e) {
      caught = e as CrdValidationError;
    }
    expect(caught?.coordinates.group).toBe('test.io');
    expect(caught?.coordinates.plural).toBe('tests');
    expect(caught?.coordinates.name).toBe('foo');
  });
});

describe('ResourceAccessor.list', () => {
  it('returns typed array on success', async () => {
    const { mockList } = getMocks();
    const items = [
      { metadata: { name: 'a' }, value: 1 },
      { metadata: { name: 'b' }, value: 2 },
    ];
    mockList.mockResolvedValue({ items });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.list({ namespace: 'default' });

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(1);
    expect(result[1].value).toBe(2);
  });

  it('returns empty array on 404', async () => {
    const { mockList } = getMocks();
    mockList.mockRejectedValue(make404());

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.list({ namespace: 'default' });

    expect(result).toEqual([]);
  });

  it('returns empty array when items is missing from response', async () => {
    const { mockList } = getMocks();
    mockList.mockResolvedValue({});

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.list({ namespace: 'default' });

    expect(result).toEqual([]);
  });

  it('throws CrdValidationError when an item fails schema', async () => {
    const { mockList } = getMocks();
    mockList.mockResolvedValue({
      items: [{ metadata: { name: 'bad' }, value: 'not-a-number' }],
    });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await expect(
      accessor.list({ namespace: 'default' }),
    ).rejects.toBeInstanceOf(CrdValidationError);
  });

  it('passes labelSelector to the API call', async () => {
    const { mockList } = getMocks();
    mockList.mockResolvedValue({ items: [] });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await accessor.list({ namespace: 'default', labelSelector: 'app=foo' });

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ labelSelector: 'app=foo' }),
    );
  });
});

describe('ResourceAccessor.listCluster', () => {
  it('returns typed array on success', async () => {
    const { mockListCluster } = getMocks();
    const items = [{ metadata: { name: 'x' }, value: 99 }];
    mockListCluster.mockResolvedValue({ items });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.listCluster();

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(99);
  });

  it('returns empty array on 404', async () => {
    const { mockListCluster } = getMocks();
    mockListCluster.mockRejectedValue(make404());

    const accessor = new CrdClient(validConfig).resource(TestResource);
    const result = await accessor.listCluster();

    expect(result).toEqual([]);
  });

  it('throws non-404 errors', async () => {
    const { mockListCluster } = getMocks();
    const err = new Error('forbidden');
    (err as any).code = 403;
    mockListCluster.mockRejectedValue(err);

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await expect(accessor.listCluster()).rejects.toThrow('forbidden');
  });

  it('passes labelSelector to the API call', async () => {
    const { mockListCluster } = getMocks();
    mockListCluster.mockResolvedValue({ items: [] });

    const accessor = new CrdClient(validConfig).resource(TestResource);
    await accessor.listCluster({ labelSelector: 'app=bar' });

    expect(mockListCluster).toHaveBeenCalledWith(
      expect.objectContaining({ labelSelector: 'app=bar' }),
    );
  });
});
