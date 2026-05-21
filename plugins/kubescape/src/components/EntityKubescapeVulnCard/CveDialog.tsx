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
} from '@material-ui/core';
import { CveEntry } from '../../types';

const SEVERITY_ORDER = [
  'critical',
  'high',
  'medium',
  'low',
  'negligible',
  'unknown',
];
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#b71c1c',
  high: '#e53935',
  medium: '#fb8c00',
  low: '#fdd835',
  negligible: '#9e9e9e',
  unknown: '#9e9e9e',
};

function severityRank(s: string): number {
  const idx = SEVERITY_ORDER.indexOf(s.toLowerCase());
  return idx === -1 ? 99 : idx;
}

type Props = {
  open: boolean;
  onClose: () => void;
  workloadName: string;
  cves: CveEntry[];
  loading: boolean;
  error?: Error;
};

export function CveDialog({
  open,
  onClose,
  workloadName,
  cves,
  loading,
  error,
}: Props) {
  const sorted = [...cves].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="cve-dialog-title">
      <DialogTitle id="cve-dialog-title">CVEs — {workloadName}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {error && (
          <Typography color="error">
            Failed to load CVEs: {error.message}
          </Typography>
        )}
        {!loading && !error && sorted.length === 0 && (
          <Typography>
            No CVE details available (manifest may have been garbage collected).
          </Typography>
        )}
        {!loading && !error && sorted.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>CVE ID</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>Current Version</TableCell>
                <TableCell>Fixed In</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(cve => (
                <TableRow key={`${cve.id}-${cve.packageName}`}>
                  <TableCell>{cve.id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={cve.severity}
                      style={{
                        backgroundColor:
                          SEVERITY_COLORS[cve.severity] ?? '#9e9e9e',
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>{cve.packageName}</TableCell>
                  <TableCell>{cve.packageVersion}</TableCell>
                  <TableCell>{cve.fixedVersion || '—'}</TableCell>
                  <TableCell style={{ maxWidth: 300, wordBreak: 'break-word' }}>
                    {cve.title}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
