const fields: Record<string, readonly string[]> = {
  root: [
    'name',
    'symbol',
    'description',
    'logo',
    'website',
    'xAccount',
    'quote',
    'supply',
    'allocation',
    'bonding',
    'eligibility',
    'participantVesting',
  ],
  allocation: ['saleShare', 'poolShare', 'teamShare', 'cliffMonths', 'vestingMonths'],
  bonding: ['target', 'creatorFee', 'startsAt', 'endsAt', 'durationDays'],
  eligibility: ['mode', 'requirements', 'identificationMode', 'identificationRequirements'],
  participantVesting: ['mode', 'tgePercent', 'cliffMonths', 'durationMonths'],
};

const validateDraftData = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (JSON.stringify(value).length > 16_384) {
    return false;
  }

  const check = (record: Record<string, unknown>, group: string): boolean =>
    Object.entries(record).every(([key, field]) => {
      if (!fields[group]?.includes(key)) {
        return false;
      }

      if (fields[key]) {
        return (
          !!field &&
          typeof field === 'object' &&
          !Array.isArray(field) &&
          check(field as Record<string, unknown>, key)
        );
      }

      return (
        (typeof field === 'string' && field.length <= 4_096) ||
        (key === 'creatorFee' && typeof field === 'boolean')
      );
    });

  return check(value as Record<string, unknown>, 'root');
};

export default validateDraftData;
