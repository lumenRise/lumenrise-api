import pino from 'pino';
import { it, vi, expect } from 'vitest';

import log from '../src/logger';

it('preserves error details and resolution context in JSON logs', (): void => {
  const destination = Reflect.get(log, pino.symbols.streamSym) as pino.DestinationStream;
  const write = vi.spyOn(destination, 'write').mockReturnValue(undefined);
  const previousLevel = log.level;
  const error = new Error('Auth provider request failed (503)');

  try {
    log.level = 'error';

    log.error(
      { error, stage: 'providerVerification', chain: 'stellar' },
      'Identity resolution failed',
    );

    const output = JSON.parse(String(write.mock.calls[0]?.[0]));

    expect(output).toMatchObject({
      error: {
        type: 'Error',
        message: 'Auth provider request failed (503)',
        stack: error.stack,
      },
      stage: 'providerVerification',
      chain: 'stellar',
      msg: 'Identity resolution failed',
    });
  } finally {
    log.level = previousLevel;

    write.mockRestore();
  }
});
