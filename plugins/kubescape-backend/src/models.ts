import { z } from 'zod';


export const RawSummarySchema = z.object({
  metadata: z
    .object({
      name: z.string().optional(),
      labels: z.record(z.string(), z.string()).optional(),
      annotations: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  spec: z
    .object({
      severities: z
        .record(z.string(), z.object({ all: z.number().optional() }))
        .optional(),
      vulnerabilitiesRef: z
        .object({
          all: z
            .object({
              name: z.string().optional(),
              namespace: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
export type RawSummary = z.infer<typeof RawSummarySchema>;

export const RawManifestMatchSchema = z.object({
  vulnerability: z
    .object({
      id: z.string().optional(),
      severity: z.string().optional(),
      description: z.string().optional(),
      fix: z
        .object({
          versions: z.array(z.string()).nullable().optional(),
        })
        .optional(),
    })
    .optional(),
  artifact: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});
export type RawManifestMatch = z.infer<typeof RawManifestMatchSchema>;

export const RawManifestSchema = z.object({
  spec: z
    .object({
      payload: z
        .object({
          matches: z.array(RawManifestMatchSchema).optional(),
        })
        .optional(),
    })
    .optional(),
});
export type RawManifest = z.infer<typeof RawManifestSchema>;

export const RawConfigScanSchema = z.object({
  spec: z
    .object({
      controls: z
        .record(
          z.string(),
          z.object({
            controlID: z.string().optional(),
            severity: z
              .object({
                severity: z.string().optional(),
                scoreFactor: z.number().optional(),
              })
              .optional(),
            status: z
              .object({
                status: z.string().optional(),
                info: z.string().optional(),
              })
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});
export type RawConfigScan = z.infer<typeof RawConfigScanSchema>;

