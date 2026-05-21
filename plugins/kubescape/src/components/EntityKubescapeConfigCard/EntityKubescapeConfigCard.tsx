import { useState } from 'react';
import { InfoCard } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  Typography,
  CircularProgress,
  Button,
  makeStyles,
} from '@material-ui/core';
import PolicyIcon from '@material-ui/icons/Policy';
import { ConfigBar } from './ConfigBar';
import { FailingControlsDialog } from './FailingControlsDialog';
import { useConfigScans } from '../../hooks/useConfigScans';
import { useFailingControls } from '../../hooks/useFailingControls';

const useStyles = makeStyles(theme => ({
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
  viewFailingBtn: {
    marginTop: theme.spacing(1),
  },
}));

function sumControls(
  items: Array<{
    controlResults: { passed: number; failed: number; skipped: number };
  }>,
) {
  return items.reduce(
    (acc, item) => ({
      passed: acc.passed + item.controlResults.passed,
      failed: acc.failed + item.controlResults.failed,
      skipped: acc.skipped + item.controlResults.skipped,
    }),
    { passed: 0, failed: 0, skipped: 0 },
  );
}

export function EntityKubescapeConfigCard() {
  const classes = useStyles();
  const { entity } = useEntity();
  const ann = entity.metadata.annotations ?? {};
  const namespace = ann['backstage.io/kubernetes-namespace'];
  const labelSelector = ann['backstage.io/kubernetes-label-selector'];

  const {
    value: workloads,
    loading,
    error,
  } = useConfigScans(namespace, labelSelector);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState('');
  const [selectedWorkload, setSelectedWorkload] = useState('');

  const {
    value: controls = [],
    loading: controlsLoading,
    error: controlsError,
  } = useFailingControls(namespace, selectedKind, selectedWorkload, dialogOpen);

  const aggregated = sumControls(workloads ?? []);

  return (
    <InfoCard
      title="Configuration Scan"
      titleTypographyProps={{ variant: 'h6' }}
      icon={<PolicyIcon />}
    >
      {loading && <CircularProgress size={24} />}
      {error && (
        <Typography color="error">
          Failed to load config scan data: {error.message}
        </Typography>
      )}
      {!loading && !error && (
        <>
          <ConfigBar counts={aggregated} />
          {(workloads ?? []).map(w => (
            <div key={w.workloadName} className={classes.workloadRow}>
              <Typography className={classes.workloadLabel}>
                {w.workloadKind}/{w.workloadName}
              </Typography>
              <ConfigBar counts={w.controlResults} />
              {w.controlResults.failed > 0 && (
                <Button
                  size="small"
                  className={classes.viewFailingBtn}
                  onClick={() => {
                    setSelectedKind(w.workloadKind);
                    setSelectedWorkload(w.workloadName);
                    setDialogOpen(true);
                  }}
                >
                  View failing controls
                </Button>
              )}
            </div>
          ))}
        </>
      )}
      <FailingControlsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workloadKind={selectedKind}
        workloadName={selectedWorkload}
        controls={controls}
        loading={controlsLoading}
        error={controlsError}
      />
    </InfoCard>
  );
}
