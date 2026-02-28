export interface ProbeResult {
  endpoint: string;
  ok: boolean;
  message: string;
}

const withTimeout = async (url: string, timeoutMs = 3500): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const buildKnownHostProbeList = (lastSuccessful: string | null, typedEndpoint: string): string[] => {
  const list = [
    lastSuccessful,
    typedEndpoint,
    typedEndpoint.includes('.local') ? typedEndpoint : null,
    'http://pocketbrain.local:11434'
  ].filter((item): item is string => Boolean(item));

  return [...new Set(list)].slice(0, 4);
};

export const probeKnownHosts = async (hosts: string[]): Promise<ProbeResult[]> => {
  const results = await Promise.all(
    hosts.map(async (host) => {
      const normalized = host.replace(/\/$/, '');
      const healthCandidates = [`${normalized}/health`, `${normalized}/api/tags`, `${normalized}/v1/models`];

      for (const candidate of healthCandidates) {
        try {
          const response = await withTimeout(candidate);
          if (response.ok) {
            return { endpoint: normalized, ok: true, message: `Connected via ${candidate}` };
          }
        } catch {
          // keep trying candidates
        }
      }

      return {
        endpoint: normalized,
        ok: false,
        message: 'Unreachable or blocked by local-network permission/CORS.'
      };
    })
  );

  return results;
};
