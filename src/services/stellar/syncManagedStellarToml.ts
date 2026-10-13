import { resolve, dirname } from 'node:path';
import { parse, stringify } from 'smol-toml';
import { Networks } from '@stellar/stellar-sdk';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';

import env from '../../env';
import parseDomain from './parseDomain';
import getManagedTomlCurrencies from './getManagedTomlCurrencies';

const syncManagedStellarToml = async (): Promise<void> => {
  const configurations = [
    {
      network: 'testnet' as const,
      domain: parseDomain(env.STELLAR_TESTNET_HOME_DOMAIN),
      passphrase: Networks.TESTNET,
      path: resolve(
        env.TESTNET_TOML ||
          resolve(env.STELLAR_TESTNET_TOML_DIRNAME, env.STELLAR_TESTNET_TOML_FILENAME),
      ),
    },
    {
      network: 'public' as const,
      domain: parseDomain(env.STELLAR_PUBLIC_HOME_DOMAIN),
      passphrase: Networks.PUBLIC,
      path: resolve(
        env.PUBLIC_TOML ||
          resolve(env.STELLAR_PUBLIC_TOML_DIRNAME, env.STELLAR_PUBLIC_TOML_FILENAME),
      ),
    },
  ].filter((configuration) => configuration.domain);

  if (configurations.length === 2 && configurations[0]?.path === configurations[1]?.path) {
    throw new Error('Testnet and public stellar.toml file paths must differ');
  }

  for (const configuration of configurations) {
    await mkdir(dirname(configuration.path), { recursive: true });

    try {
      await writeFile(
        configuration.path,
        stringify({
          VERSION: '2.3.0',
          NETWORK_PASSPHRASE: configuration.passphrase,
          DOCUMENTATION: {
            ORG_NAME: 'Lumenrise',
            ORG_URL: `https://${configuration.domain}`,
          },
        }),
        { flag: 'wx', mode: 0o644 },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    const body = await readFile(configuration.path, 'utf8');
    const document = parse(body);

    if (document.NETWORK_PASSPHRASE !== configuration.passphrase) {
      throw new Error(`Stellar TOML network mismatch for ${configuration.network}`);
    }

    const currencies = document.CURRENCIES ?? [];

    if (!Array.isArray(currencies)) {
      throw new Error(`Invalid CURRENCIES in ${configuration.network} stellar.toml`);
    }

    const publishedAssets = new Set(
      currencies.map((currency) => {
        if (
          typeof currency !== 'object' ||
          currency === null ||
          !('code' in currency) ||
          !('issuer' in currency) ||
          typeof currency.code !== 'string' ||
          typeof currency.issuer !== 'string'
        ) {
          throw new Error(`Invalid currency in ${configuration.network} stellar.toml`);
        }

        return JSON.stringify([currency.code, currency.issuer]);
      }),
    );
    const launches = await getManagedTomlCurrencies(configuration.network);
    const additions = launches.filter((currency) => {
      const key = JSON.stringify([currency.code, currency.issuer]);

      if (publishedAssets.has(key)) {
        return false;
      }

      publishedAssets.add(key);
      return true;
    });

    if (additions.length > 0) {
      await appendFile(configuration.path, `\n${stringify({ CURRENCIES: additions })}`);
    }
  }
};

export default syncManagedStellarToml;
