import { makeStyles, Typography } from '@material-ui/core';
import { SeverityCounts } from '../../types';

const SEVERITY_COLORS: Record<keyof SeverityCounts, string> = {
  critical: '#b71c1c',
  high: '#e53935',
  medium: '#fb8c00',
  low: '#fdd835',
  negligible: '#9e9e9e',
};

const SEVERITY_ORDER: Array<keyof SeverityCounts> = [
  'critical',
  'high',
  'medium',
  'low',
  'negligible',
];

const useStyles = makeStyles(theme => ({
  bar: {
    display: 'flex',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  segment: {
    height: '100%',
  },
  legend: {
    display: 'flex',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  legendCount: {
    fontWeight: 700,
    fontSize: '0.875rem',
  },
  legendLabel: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  empty: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
}));

type Props = {
  counts: SeverityCounts;
};

export function SeverityBar({ counts }: Props) {
  const classes = useStyles();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  if (total === 0) {
    return (
      <Typography className={classes.empty}>No scan data available</Typography>
    );
  }

  return (
    <>
      <div className={classes.bar}>
        {SEVERITY_ORDER.filter(s => counts[s] > 0).map(s => (
          <div
            key={s}
            data-severity={s}
            className={classes.segment}
            style={{
              width: `${(counts[s] / total) * 100}%`,
              backgroundColor: SEVERITY_COLORS[s],
            }}
          />
        ))}
      </div>
      <div className={classes.legend}>
        {SEVERITY_ORDER.map(s => (
          <div key={s} className={classes.legendItem}>
            <Typography
              className={classes.legendCount}
              style={{ color: SEVERITY_COLORS[s] }}
            >
              {counts[s]}
            </Typography>
            <Typography className={classes.legendLabel}>{s}</Typography>
          </div>
        ))}
      </div>
    </>
  );
}
