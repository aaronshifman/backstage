import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
  errorApiRef,
} from '@backstage/frontend-plugin-api';
import { useAsync } from 'react-use';
import { WorkloadConfigScan } from '../types';

export function useConfigScans(
  namespace: string | undefined,
  labelSelector: string | undefined,
) {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const errorApi = useApi(errorApiRef);

  return useAsync(async (): Promise<WorkloadConfigScan[]> => {
    if (!namespace || !labelSelector) return [];
    const baseUrl = await discoveryApi.getBaseUrl('kubescape');
    const params = new URLSearchParams({ namespace, labelSelector });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetchApi.fetch(
        `${baseUrl}/configscans?${params}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(`Failed to fetch config scans: ${response.status}`);
      return response.json();
    } catch (error) {
      errorApi.post(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [namespace, labelSelector]);
}
