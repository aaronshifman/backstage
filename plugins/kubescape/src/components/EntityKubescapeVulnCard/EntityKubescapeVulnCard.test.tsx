import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/frontend-plugin-api';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { EntityKubescapeVulnCard } from './EntityKubescapeVulnCard';

const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'myapp',
    annotations: {
      'backstage.io/kubernetes-namespace': 'default',
      'backstage.io/kubernetes-label-selector': 'app=myapp',
    },
  },
  spec: { type: 'service', lifecycle: 'production', owner: 'team' },
};

const mockVulnData = [
  {
    workloadName: 'myapp',
    workloadKind: 'deployment',
    containerName: 'app',
    severities: { critical: 1, high: 3, medium: 5, low: 2, negligible: 0 },
  },
];

function renderCard(vulnResponse: any = mockVulnData) {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => vulnResponse,
  });

  return renderInTestApp(
    <EntityProvider entity={mockEntity as any}>
      <EntityKubescapeVulnCard />
    </EntityProvider>,
    {
      mountedRoutes: {},
      apis: [
        [
          discoveryApiRef,
          { getBaseUrl: async () => 'http://localhost:7007/api/kubescape' },
        ],
        [fetchApiRef, { fetch: mockFetch }],
      ],
    },
  );
}

describe('EntityKubescapeVulnCard', () => {
  it('renders the card title', async () => {
    await renderCard();
    expect(await screen.findByText('Vulnerability Scan')).toBeInTheDocument();
  });

  it('renders total CVE count in header', async () => {
    await renderCard();
    // total = 1+3+5+2+0 = 11
    expect(await screen.findByText(/11/)).toBeInTheDocument();
  });

  it('renders the severity bar with counts', async () => {
    const { container } = await renderCard();
    await screen.findByText('Vulnerability Scan');
    const criticalSeg = container.querySelector('[data-severity="critical"]');
    expect(criticalSeg).toBeTruthy();
  });

  it('shows "View CVEs" button', async () => {
    await renderCard();
    expect(
      await screen.findByRole('button', { name: /view cves/i }),
    ).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    await renderCard([]);
    expect(await screen.findByText(/no scan data/i)).toBeInTheDocument();
  });
});
