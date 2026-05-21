import { render, screen } from '@testing-library/react';
import { SeverityBar } from './SeverityBar';

const counts = { critical: 2, high: 5, medium: 10, low: 3, negligible: 1 };

describe('SeverityBar', () => {
  it('renders a bar segment for each non-zero severity', () => {
    const { container } = render(<SeverityBar counts={counts} />);
    // 5 segments: critical, high, medium, low, negligible
    const segments = container.querySelectorAll('[data-severity]');
    expect(segments).toHaveLength(5);
  });

  it('renders critical segment with dark red color', () => {
    const { container } = render(<SeverityBar counts={counts} />);
    const criticalSeg = container.querySelector('[data-severity="critical"]');
    expect(criticalSeg).toBeTruthy();
    expect((criticalSeg as HTMLElement).style.backgroundColor).toBe(
      'rgb(183, 28, 28)',
    );
  });

  it('omits zero-count severities from the bar', () => {
    const { container } = render(
      <SeverityBar
        counts={{ critical: 0, high: 0, medium: 5, low: 0, negligible: 0 }}
      />,
    );
    const segments = container.querySelectorAll('[data-severity]');
    expect(segments).toHaveLength(1);
    expect(segments[0].getAttribute('data-severity')).toBe('medium');
  });

  it('renders legend counts below the bar', () => {
    render(<SeverityBar counts={counts} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // critical
    expect(screen.getByText('5')).toBeInTheDocument(); // high
    expect(screen.getByText('10')).toBeInTheDocument(); // medium
  });

  it('shows empty state when all counts are zero', () => {
    render(
      <SeverityBar
        counts={{ critical: 0, high: 0, medium: 0, low: 0, negligible: 0 }}
      />,
    );
    expect(screen.getByText(/no scan data/i)).toBeInTheDocument();
  });
});
