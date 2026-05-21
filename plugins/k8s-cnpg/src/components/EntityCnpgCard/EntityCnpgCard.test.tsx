import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { EntityCnpgCard } from './EntityCnpgCard';

const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Resource',
  metadata: {
    name: 'mydb--production',
    annotations: {
      'cnpg.io/cluster-name': 'mydb',
      'cnpg.io/namespace': 'production',
      'cnpg.io/pg-version': '17',
      'cnpg.io/instances': '3',
      'cnpg.io/cluster-status': 'Cluster in healthy state',
      'cnpg.io/backup-status': 'True',
      'cnpg.io/continuous-archiving': 'True',
      'cnpg.io/continuous-archiving-reason': 'ContinuousArchivingSucceeding',
      'cnpg.io/last-backup-time': '2026-05-01T00:01:47Z',
      'cnpg.io/last-archive-time': '2026-05-01T00:05:00Z',
    },
  },
  spec: {
    type: 'database',
    lifecycle: 'production',
    owner: 'group:default/platform',
  },
};

const renderCard = () =>
  renderInTestApp(
    <EntityProvider entity={mockEntity as any}>
      <EntityCnpgCard />
    </EntityProvider>,
  );

describe('EntityCnpgCard', () => {
  it('shows cluster name and namespace', async () => {
    await renderCard();
    expect(await screen.findByText('mydb')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('shows PG version and instance count', async () => {
    await renderCard();
    expect(await screen.findByText('17')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows healthy cluster status', async () => {
    await renderCard();
    expect(await screen.findByText(/healthy/i)).toBeInTheDocument();
  });

  it('shows backup succeeded badge', async () => {
    await renderCard();
    expect(await screen.findByText(/backup/i)).toBeInTheDocument();
  });

  it('shows archiving active badge', async () => {
    await renderCard();
    expect(await screen.findByText(/archiving/i)).toBeInTheDocument();
  });

  it('shows relative last backup and archive times', async () => {
    await renderCard();
    const timeEls = await screen.findAllByText(/\d+[mh] ago/);
    expect(timeEls.length).toBeGreaterThanOrEqual(2);
  });
});
