const decimalInteger = (value: string): string => {
  if (/^\d+$/.test(value)) {
    return BigInt(value).toString();
  }

  const match = /^(\d+)(?:\.(\d+))?E\+?(\d+)$/i.exec(value);

  if (!match) {
    throw new Error('Invalid aggregate amount');
  }

  const fraction = match[2] ?? '';
  const exponent = Number(match[3]);
  const digits = match[1]! + fraction;

  if (exponent < fraction.length || exponent > 100) {
    throw new Error('Non-integer aggregate amount');
  }

  return BigInt(digits + '0'.repeat(exponent - fraction.length)).toString();
};

export default decimalInteger;
