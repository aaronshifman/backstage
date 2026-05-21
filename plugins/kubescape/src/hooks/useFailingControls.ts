import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
  errorApiRef,
} from '@backstage/frontend-plugin-api';
import { useAsync } from 'react-use';
import { FailingControl } from '../types';

export function useFailingControls(
  namespace: string | undefined,
  workloadKind: string | undefined,
  workloadName: string | undefined,
  enabled: boolean,
) {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const errorApi = useApi(errorApiRef);

  return useAsync(async (): Promise<FailingControl[]> => {
    if (!namespace || !workloadKind || !workloadName || !enabled) return [];
    const baseUrl = await discoveryApi.getBaseUrl('kubescape');
    const params = new URLSearchParams({
      namespace,
      workloadKind,
      workloadName,
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetchApi.fetch(
        `${baseUrl}/configscans/controls?${params}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(
          `Failed to fetch failing controls: ${response.status}`,
        );
      return response.json();
    } catch (error) {
      errorApi.post(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [namespace, workloadKind, workloadName, enabled]);
}
