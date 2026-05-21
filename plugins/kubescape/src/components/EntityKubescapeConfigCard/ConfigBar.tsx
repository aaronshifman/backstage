import { makeStyles, Typography } from '@material-ui/core';

type ConfigCounts = { passed: number; failed: number; skipped: number };

const COLORS = {
  passed: '#2e7d32',
  failed: '#e53935',
  skipped: '#9e9e9e',
};

const useStyles = makeStyles(theme => ({
  bar: {
    display: 'flex',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  segment: { height: '100%' },
  legend: {
    display: 'flex',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  legendItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  legendCount: { fontWeight: 700, fontSize: '0.875rem' },
  legendLabel: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  empty: { color: theme.palette.text.secondary, fontSize: '0.875rem' },
}));

type Props = { counts: ConfigCounts };

export function ConfigBar({ counts }: Props) {
  const classes = useStyles();
  const total = counts.passed + counts.failed + counts.skipped;

  if (total === 0) {
    return (
      <Typography className={classes.empty}>No scan data available</Typography>
    );
  }

  const segments: Array<{ key: keyof ConfigCounts }> = [
    { key: 'passed' },
    { key: 'failed' },
    { key: 'skipped' },
  ];

  return (
    <>
      <div className={classes.bar}>
        {segments
          .filter(({ key }) => counts[key] > 0)
          .map(({ key }) => (
            <div
              key={key}
              data-config-status={key}
              className={classes.segment}
              style={{
                width: `${(counts[key] / total) * 100}%`,
                backgroundColor: COLORS[key],
              }}
            />
          ))}
      </div>
      <div className={classes.legend}>
        {segments.map(({ key }) => (
          <div key={key} className={classes.legendItem}>
            <Typography
              className={classes.legendCount}
              style={{ color: COLORS[key] }}
            >
              {counts[key]}
            </Typography>
            <Typography className={classes.legendLabel}>{key}</Typography>
          </div>
        ))}
      </div>
    </>
  );
}
