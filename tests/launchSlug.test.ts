import { describe, expect, it } from 'vitest';

import toLaunchSlug from '../src/utils/launch/toLaunchSlug';

describe('canonical project names', () => {
  it.each(['blue man', 'blue-man', 'Blue Man', '  blue   man  ', 'blue---man'])('%s claims the same name', (name) => {
    expect(toLaunchSlug(name)).toBe('blue-man');
  });

  it.each(['', '   ', '---', 'team', 'Prelaunch', 'a'.repeat(101)])('rejects unusable names: %s', (name) => {
    expect(() => toLaunchSlug(name)).toThrow();
  });
});
