import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Typography,
  Chip,
  Link,
} from '@material-ui/core';
import { FailingControl } from '../../types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#b71c1c',
  high: '#e53935',
  medium: '#fb8c00',
  low: '#fdd835',
  unknown: '#9e9e9e',
};

type Props = {
  open: boolean;
  onClose: () => void;
  workloadKind: string;
  workloadName: string;
  controls: FailingControl[];
  loading: boolean;
  error?: Error;
};

export function FailingControlsDialog({
  open,
  onClose,
  workloadKind,
  workloadName,
  controls,
  loading,
  error,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="failing-controls-dialog-title">
      <DialogTitle id="failing-controls-dialog-title">
        Failing Controls — {workloadKind}/{workloadName}
      </DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {error && (
          <Typography color="error">
            Failed to load controls: {error.message}
          </Typography>
        )}
        {!loading && !error && controls.length === 0 && (
          <Typography>No failing controls found.</Typography>
        )}
        {!loading && !error && controls.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Control</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Info</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controls.map(c => (
                <TableRow key={c.controlID}>
                  <TableCell>
                    <Link
                      href={`https://kubescape.io/docs/controls/${c.controlID.toLowerCase()}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.controlID}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.severity}
                      style={{
                        backgroundColor:
                          SEVERITY_COLORS[c.severity.toLowerCase()] ??
                          '#9e9e9e',
                        color:
                          c.severity.toLowerCase() === 'low' ? '#000' : '#fff',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>{c.scoreFactor}</TableCell>
                  <TableCell>{c.info || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
