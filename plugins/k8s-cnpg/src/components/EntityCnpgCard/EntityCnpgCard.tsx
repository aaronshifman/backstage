import { InfoCard } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { timeAgo } from '../../utils/timeAgo';
import { makeStyles, Grid, Typography, Chip } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import StorageIcon from '@material-ui/icons/Storage';

const useStyles = makeStyles(theme => ({
  subtitle: {
    color: theme.palette.text.secondary,
    fontSize: '0.85rem',
    marginBottom: theme.spacing(1.5),
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: theme.palette.primary.main,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0.75, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  statusLabel: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  chipOk: {
    backgroundColor: '#e6f4ea',
    color: '#1e7e34',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  chipErr: {
    backgroundColor: '#fce8e6',
    color: '#c62828',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  divider: {
    margin: theme.spacing(1.5, 0),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  statDot: {
    fontSize: '1.4rem',
    lineHeight: 1,
  },
}));

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  const classes = useStyles();
  return (
    <Chip
      size="small"
      icon={
        ok ? (
          <CheckCircleIcon style={{ color: '#1e7e34' }} />
        ) : (
          <CancelIcon style={{ color: '#c62828' }} />
        )
      }
      label={label}
      className={ok ? classes.chipOk : classes.chipErr}
    />
  );
}

export function EntityCnpgCard() {
  const classes = useStyles();
  const { entity } = useEntity();
  const ann = entity.metadata.annotations ?? {};

  const clusterName = ann['cnpg.io/cluster-name'] ?? entity.metadata.name;
  const namespace = ann['cnpg.io/namespace'] ?? '';
  const pgVersion = ann['cnpg.io/pg-version'] ?? '';
  const instances = ann['cnpg.io/instances'] ?? '';
  const clusterStatus = ann['cnpg.io/cluster-status'] ?? '';
  const backupOk = ann['cnpg.io/backup-status'] === 'True';
  const archivingOk = ann['cnpg.io/continuous-archiving'] === 'True';
  const isHealthy = clusterStatus.toLowerCase().includes('healthy');
  const lastBackupTime = timeAgo(ann['cnpg.io/last-backup-time'] ?? '');
  const lastArchiveTime = timeAgo(ann['cnpg.io/last-archive-time'] ?? '');

  return (
    <InfoCard
      title="CNPG Cluster"
      titleTypographyProps={{ variant: 'h6' }}
      icon={<StorageIcon />}
    >
      <Typography className={classes.subtitle}>
        <span>{namespace}</span>
        {' / '}
        <span>{clusterName}</span>
      </Typography>

      <Grid
        container
        spacing={3}
        justifyContent="space-around"
        style={{ marginBottom: 12 }}
      >
        <Grid item style={{ textAlign: 'center' }}>
          <Typography className={classes.statValue}>
            {pgVersion || '—'}
          </Typography>
          <Typography className={classes.statLabel}>PG Version</Typography>
        </Grid>
        <Grid item style={{ textAlign: 'center' }}>
          <Typography className={classes.statValue}>
            {instances || '—'}
          </Typography>
          <Typography className={classes.statLabel}>Instances</Typography>
        </Grid>
        <Grid item style={{ textAlign: 'center' }}>
          <Typography
            className={classes.statDot}
            style={{ color: isHealthy ? '#1e7e34' : '#c62828' }}
          >
            ●
          </Typography>
          <Typography className={classes.statLabel}>
            {isHealthy ? 'Healthy' : 'Degraded'}
          </Typography>
        </Grid>
      </Grid>

      <div className={classes.divider} />

      <div className={classes.statusRow}>
        <Typography className={classes.statusLabel}>
          Continuous Archiving
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography variant="caption" color="textSecondary">
            {lastArchiveTime}
          </Typography>
          <StatusChip
            ok={archivingOk}
            label={archivingOk ? 'Active' : 'Inactive'}
          />
        </div>
      </div>
      <div className={classes.statusRow}>
        <Typography className={classes.statusLabel}>Last Backup</Typography>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography variant="caption" color="textSecondary">
            {lastBackupTime}
          </Typography>
          <StatusChip ok={backupOk} label={backupOk ? 'Succeeded' : 'Failed'} />
        </div>
      </div>
    </InfoCard>
  );
}
