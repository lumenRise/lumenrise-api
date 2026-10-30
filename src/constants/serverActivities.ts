const serverActivities = [
  { method: 'POST', path: /^\/v1\/auth\/register\/?$/, message: 'User registration completed' },
  { method: 'PUT', path: /^\/v1\/user\/avatar\/?$/, message: 'User avatar updated' },
  { method: 'DELETE', path: /^\/v1\/user\/avatar\/?$/, message: 'User avatar removed' },
  {
    method: 'POST',
    path: /^\/v1\/launches\/prelaunch\/?$/,
    message: 'Launch draft and token image saved',
  },
  {
    method: 'PATCH',
    path: /^\/v1\/launches\/[^/]+\/team\/invitation\/?$/,
    message: 'Launch team invitation answered',
  },
  {
    method: 'POST',
    path: /^\/v1\/launches\/[^/]+\/team\/external\/?$/,
    message: 'External launch team member added',
  },
  {
    method: 'PUT',
    path: /^\/v1\/launches\/[^/]+\/team\/external\/[^/]+\/?$/,
    message: 'External launch team member updated',
  },
  {
    method: 'DELETE',
    path: /^\/v1\/launches\/[^/]+\/team\/external\/[^/]+\/?$/,
    message: 'External launch team member removed',
  },
  {
    method: 'PUT',
    path: /^\/v1\/launches\/[^/]+\/team\/[^/]+\/?$/,
    message: 'Launch team member saved',
  },
  {
    method: 'DELETE',
    path: /^\/v1\/launches\/[^/]+\/team\/[^/]+\/?$/,
    message: 'Launch team member removed',
  },
  { method: 'POST', path: /^\/v1\/developers\/keys\/?$/, message: 'Developer API key created' },
  {
    method: 'DELETE',
    path: /^\/v1\/developers\/keys\/[^/]+\/?$/,
    message: 'Developer API key revoked',
  },
  { method: 'POST', path: /^\/v1\/policies\/?$/, message: 'Policy created' },
  {
    method: 'POST',
    path: /^\/v1\/policies\/[^/]+\/evaluate\/?$/,
    message: 'Policy evaluation completed',
  },
  {
    method: 'POST',
    path: /^\/v1\/connections\/github\/sync\/?$/,
    message: 'GitHub account synchronization requested',
  },
  {
    method: 'POST',
    path: /^\/v1\/connections\/x\/sync\/?$/,
    message: 'X account synchronization requested',
  },
  {
    method: 'DELETE',
    path: /^\/v1\/connections\/[^/]+\/?$/,
    message: 'External account disconnected',
  },
  {
    method: 'POST',
    path: /^\/v1\/stellar\/accounts\/[^/]+\/activity-scan\/?$/,
    message: 'Stellar account activity scan requested',
  },
] as const;

export default serverActivities;
