import type { Entity } from '@backstage/catalog-model';
import { computeComponentCompletenessFacts } from './componentCompletenessFactRetriever';

function component(overrides: Partial<Entity>): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'svc', ...(overrides.metadata ?? {}) },
    spec: { type: 'service', ...(overrides.spec ?? {}) },
  } as Entity;
}

describe('computeComponentCompletenessFacts', () => {
  it('flags a fully-complete component as all true', () => {
    const facts = computeComponentCompletenessFacts(
      component({
        metadata: {
          name: 'svc',
          description: 'A real service',
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/x/y',
            'backstage.io/techdocs-ref': 'dir:.',
            'argocd/app-name': 'svc',
            'backstage.io/kubernetes-namespace': 'svc',
          },
        },
        spec: {
          type: 'service',
          owner: 'group:default/platform',
          system: 'core',
        },
      }),
    );
    expect(facts).toEqual({
      hasOwner: true,
      hasSystem: true,
      hasDescription: true,
      hasSourceLocation: true,
      hasTechdocs: true,
      gitopsWired: true,
    });
  });

  it('treats an owner of "unknown" as no owner', () => {
    const facts = computeComponentCompletenessFacts(
      component({ spec: { type: 'service', owner: 'unknown' } }),
    );
    expect(facts.hasOwner).toBe(false);
  });

  it('requires BOTH an argocd app and a k8s annotation for gitopsWired', () => {
    const onlyArgo = computeComponentCompletenessFacts(
      component({
        metadata: { name: 'svc', annotations: { 'argocd/app-name': 'svc' } },
      }),
    );
    const onlyK8s = computeComponentCompletenessFacts(
      component({
        metadata: {
          name: 'svc',
          annotations: { 'backstage.io/kubernetes-label-selector': 'app=svc' },
        },
      }),
    );
    expect(onlyArgo.gitopsWired).toBe(false);
    expect(onlyK8s.gitopsWired).toBe(false);
  });

  it('returns all false for a bare component', () => {
    const facts = computeComponentCompletenessFacts(component({}));
    expect(facts).toEqual({
      hasOwner: false,
      hasSystem: false,
      hasDescription: false,
      hasSourceLocation: false,
      hasTechdocs: false,
      gitopsWired: false,
    });
  });
});
