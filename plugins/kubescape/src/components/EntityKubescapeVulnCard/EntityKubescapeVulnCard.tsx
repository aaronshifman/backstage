import { useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  Typography,
  Button,
  CircularProgress,
  makeStyles,
} from '@material-ui/core';
import SecurityIcon from '@material-ui/icons/Security';
import { SeverityBar } from '../SeverityBar/SeverityBar';
import { CveDialog } from './CveDialog';
import { useVulnerabilities } from '../../hooks/useVulnerabilities';
import { useCves } from '../../hooks/useCves';
import { SeverityCounts } from '../../types';

function getContainerSuffix(containerName: string): string {
  return containerName ? ` (${containerName})` : '';
}

const useStyles = makeStyles(theme => ({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  totalCount: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  workloadRow: {
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  workloadLabel: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  viewCveBtn: {
    marginTop: theme.spacing(1),
  },
}));

function sumSeverities(
  items: Array<{ severities: SeverityCounts }>,
): SeverityCounts {
  return items.reduce(
    (acc, item) => ({
      critical: acc.critical + item.severities.critical,
      high: acc.high + item.severities.high,
      medium: acc.medium + item.severities.medium,
      low: acc.low + item.severities.low,
      negligible: acc.negligible + item.severities.negligible,
    }),
    { critical: 0, high: 0, medium: 0, low: 0, negligible: 0 },
  );
}

export function EntityKubescapeVulnCard() {
  const classes = useStyles();
  const { entity } = useEntity();
  const ann = entity.metadata.annotations ?? {};
  const namespace = ann['backstage.io/kubernetes-namespace'];
  const labelSelector = ann['backstage.io/kubernetes-label-selector'];

  const {
    value: workloads,
    loading,
    error,
  } = useVulnerabilities(namespace, labelSelector);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState('');

  const {
    value: cves = [],
    loading: cvesLoading,
    error: cvesError,
  } = useCves(namespace ?? '', selectedWorkload, dialogOpen);

  const aggregated = sumSeverities(workloads ?? []);
  const total = Object.values(aggregated).reduce((s, n) => s + n, 0);

  const titleAction =
    total > 0 ? (
      <span className={classes.totalCount}>{total} total</span>
    ) : null;

  return (
    <InfoCard
      title="Vulnerability Scan"
      titleTypographyProps={{ variant: 'h6' }}
      icon={<SecurityIcon />}
      action={titleAction}
    >
      {loading && <CircularProgress size={24} />}
      {error && (
        <Typography color="error">
          Failed to load vulnerability data: {error.message}
        </Typography>
      )}
      {!loading && !error && (
        <>
          <SeverityBar counts={aggregated} />
          {(workloads ?? []).map(w => (
            <div
              key={`${w.workloadName}-${w.containerName}`}
              className={classes.workloadRow}
            >
              <Typography className={classes.workloadLabel}>
                {w.workloadKind}/{w.workloadName}
                {w.imageTag
                  ? ` · ${w.imageTag}`
                  : getContainerSuffix(w.containerName)}
              </Typography>
              <SeverityBar counts={w.severities} />
              <Button
                size="small"
                className={classes.viewCveBtn}
                onClick={() => {
                  setSelectedWorkload(w.workloadName);
                  setDialogOpen(true);
                }}
              >
                View CVEs
              </Button>
            </div>
          ))}
        </>
      )}
      <CveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workloadName={selectedWorkload}
        cves={cves}
        loading={cvesLoading}
        error={cvesError}
      />
    </InfoCard>
  );
}
