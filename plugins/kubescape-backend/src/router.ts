import { Router } from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { KubescapeClient } from './KubescapeClient';
import { readKubescapeConfig } from './config';

export async function createRouter(options: {
  logger: LoggerService;
  config: Config;
}) {
  const { logger, config } = options;
  const kubescapeConfig = readKubescapeConfig(config);
  const client = new KubescapeClient(kubescapeConfig);

  const router = Router();

  router.get('/vulnerabilities', async (req, res) => {
    const { namespace, labelSelector } = req.query as Record<string, string>;
    if (!namespace || !labelSelector) {
      res
        .status(400)
        .json({ error: 'namespace and labelSelector are required' });
      return;
    }
    try {
      const data = await client.getVulnerabilities(namespace, labelSelector);
      res.json(data);
    } catch (err) {
      logger.error('Failed to fetch vulnerabilities', err as Error);
      res.status(500).json({ error: 'Failed to fetch vulnerability data' });
    }
  });

  router.get('/cves', async (req, res) => {
    const { namespace, workloadName } = req.query as Record<string, string>;
    if (!namespace || !workloadName) {
      res
        .status(400)
        .json({ error: 'namespace and workloadName are required' });
      return;
    }
    try {
      const data = await client.getCves(namespace, workloadName);
      res.json(data);
    } catch (err) {
      logger.error('Failed to fetch CVEs', err as Error);
      res.status(500).json({ error: 'Failed to fetch CVE data' });
    }
  });

  router.get('/configscans/controls', async (req, res) => {
    const { namespace, workloadKind, workloadName } = req.query as Record<
      string,
      string
    >;
    if (!namespace || !workloadKind || !workloadName) {
      res.status(400).json({
        error: 'namespace, workloadKind and workloadName are required',
      });
      return;
    }
    try {
      const data = await client.getFailingControls(
        namespace,
        workloadKind,
        workloadName,
      );
      res.json(data);
    } catch (err) {
      logger.error('Failed to fetch failing controls', err as Error);
      res.status(500).json({ error: 'Failed to fetch failing controls' });
    }
  });

  router.get('/configscans', async (req, res) => {
    const { namespace, labelSelector } = req.query as Record<string, string>;
    if (!namespace || !labelSelector) {
      res
        .status(400)
        .json({ error: 'namespace and labelSelector are required' });
      return;
    }
    try {
      const data = await client.getConfigScans(namespace, labelSelector);
      res.json(data);
    } catch (err) {
      logger.error('Failed to fetch config scans', err as Error);
      res.status(500).json({ error: 'Failed to fetch config scan data' });
    }
  });

  return router;
}
