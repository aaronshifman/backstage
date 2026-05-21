import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/frontend-plugin-api';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { EntityKubescapeConfigCard } from './EntityKubescapeConfigCard';

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

const mockConfigData = [
  {
    workloadName: 'myapp',
    workloadKind: 'deployment',
    controlResults: { passed: 28, failed: 4, skipped: 2 },
  },
];

function renderCard(configResponse: any = mockConfigData) {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => configResponse,
  });

  return renderInTestApp(
    <EntityProvider entity={mockEntity as any}>
      <EntityKubescapeConfigCard />
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

describe('EntityKubescapeConfigCard', () => {
  it('renders the card title', async () => {
    await renderCard();
    expect(await screen.findByText('Configuration Scan')).toBeInTheDocument();
  });

  it('renders pass/fail/skip counts', async () => {
    await renderCard();
    await screen.findByText('Configuration Scan');
    expect(screen.getAllByText('28').length).toBeGreaterThan(0); // passed
    expect(screen.getAllByText('4').length).toBeGreaterThan(0); // failed
  });

  it('renders config bar segments', async () => {
    const { container } = await renderCard();
    await screen.findAllByText('28'); // wait for data to load
    expect(
      container.querySelector('[data-config-status="passed"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-config-status="failed"]'),
    ).toBeTruthy();
  });

  it('shows empty state when no data', async () => {
    await renderCard([]);
    expect(await screen.findByText(/no scan data/i)).toBeInTheDocument();
  });
});
