import https from 'node:https';
import { lookup } from 'node:dns/promises';

import isPublicAddress from './isPublicAddress';

const fetchStellarToml = async (domain: string): Promise<string> => new Promise((resolve, reject) => {
  const request = https.get({
    hostname: domain,
    path: '/.well-known/stellar.toml',
    timeout: 10_000,
    headers: { Accept: 'text/plain, application/toml' },
    lookup: (hostname, _options, callback) => {
      void lookup(hostname, { all: true }).then((addresses) => {
        if (addresses.length === 0 || addresses.some((item) => !isPublicAddress(item.address))) {
          callback(new Error('Home domain resolves to a restricted address'), '', 4);
          return;
        }

        const selected = addresses[0]!;
        callback(null, selected.address, selected.family);
      }).catch((error: unknown) => callback(error as Error, '', 4));
    },
  }, (response) => {
    if (response.statusCode !== 200) {
      response.resume();
      reject(new Error(`stellar.toml returned ${response.statusCode ?? 'no status'}`));
      return;
    }

    const contentType = response.headers['content-type'];

    if (typeof contentType !== 'string' || !/^(text\/plain|application\/toml)(;|$)/i.test(contentType)) {
      response.resume();
      reject(new Error('stellar.toml has an invalid content type'));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;

    response.on('data', (chunk: Buffer) => {
      size += chunk.length;

      if (size > 100_000) {
        request.destroy(new Error('stellar.toml exceeds 100 KB'));
        return;
      }

      chunks.push(chunk);
    });
    response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    response.on('error', reject);
  });

  request.on('timeout', () => request.destroy(new Error('stellar.toml request timed out')));
  request.on('error', reject);
});

export default fetchStellarToml;
