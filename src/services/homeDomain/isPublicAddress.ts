import { isIP } from 'node:net';

const isPublicAddress = (address: string): boolean => {
  const version = isIP(address);

  if (version === 4) {
    const a = Number(address.split('.')[0]);
    const b = Number(address.split('.')[1]);

    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && address.split('.')[2] === '100'))) ||
      (a === 203 && b === 0 && address.split('.')[2] === '113')
    );
  }

  if (version === 6) {
    const lower = address.toLowerCase();

    return (lower.startsWith('2') || lower.startsWith('3')) &&
      !lower.startsWith('2001:db8:') && !lower.startsWith('2001:0:');
  }

  return false;
};

export default isPublicAddress;
