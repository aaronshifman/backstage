export type SeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  negligible: number;
};

export type WorkloadVulnerability = {
  workloadName: string;
  workloadKind: string;
  containerName: string;
  imageTag: string;
  severities: SeverityCounts;
};

export type CveEntry = {
  id: string;
  severity: string;
  packageName: string;
  packageVersion: string;
  fixedVersion: string;
  title: string;
};

export type WorkloadConfigScan = {
  workloadName: string;
  workloadKind: string;
  controlResults: {
    passed: number;
    failed: number;
    skipped: number;
  };
};

export type FailingControl = {
  controlID: string;
  severity: string;
  scoreFactor: number;
  info: string;
};
