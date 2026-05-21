import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
  errorApiRef,
} from '@backstage/frontend-plugin-api';
import { useAsync } from 'react-use';
import { CveEntry } from '../types';

export function useCves(
  namespace: string,
  workloadName: string,
  enabled: boolean,
) {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const errorApi = useApi(errorApiRef);

  return useAsync(async (): Promise<CveEntry[]> => {
    if (!enabled || !namespace || !workloadName) return [];
    const baseUrl = await discoveryApi.getBaseUrl('kubescape');
    const params = new URLSearchParams({ namespace, workloadName });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetchApi.fetch(`${baseUrl}/cves?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Failed to fetch CVEs: ${response.status}`);
      return response.json();
    } catch (error) {
      errorApi.post(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [namespace, workloadName, enabled]);
}
