import applicationRules from '../../constants/applicationRules';

const parseOptionalProjectUrl = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length > applicationRules.projectLinks.maxLength) {
    throw new Error('Project links must be HTTPS URLs of up to 2048 characters');
  }

  const link = value.trim();

  if (!link) {
    return undefined;
  }

  const url = new URL(link);

  if (
    !applicationRules.projectLinks.protocols.some((protocol) => protocol === url.protocol) ||
    !url.hostname.includes('.') ||
    url.username ||
    url.password
  ) {
    throw new Error('Project links must be HTTPS URLs without credentials');
  }

  return link;
};

export default parseOptionalProjectUrl;
