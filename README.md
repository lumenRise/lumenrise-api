# Lumenrise API

Launch URLs use the project's immutable `slug`, for example
`GET /v1/launches/blue-man/chart?network=testnet`. The API resolves that slug
within the requested network and uses `contractId` for all internal records,
queues and blockchain calls. Contract and asset addresses remain available in
responses for transaction construction.

Create a prelaunch with multipart fields `name`, `ownerAddress` and `image`,
plus optional `network`, `website` and `xAccount`. The response includes `name`
and `slug`. Use the same project name in the transaction's metadata and the
returned image URL. Names are trimmed and lowercased; runs of non-ASCII
alphanumeric characters become hyphens, and leading/trailing hyphens are removed.
`Blue Man`, `blue-man` and `blue   man` all claim `blue-man`. Slugs must contain
1 to 100 characters; `team` and `prelaunch` are reserved. Symbols can repeat.

A unique database claim reserves each name per network across API requests and
on-chain indexing. A taken name returns `409`. Unused reservations are released
by the existing token image cleanup lifecycle; indexed names remain claimed.
Launch lists, details, prelaunch status and team invitations expose the slug.
Clients must use slugs for every launch route, including team management,
invitation responses, trade submission, holders, market data and charts.

Before deploying, stop the old launch workers and run `npm run migrate` against
the configured database. Migration `20261022-launch-slugs` validates existing
names, creates name claims and backfills slugs. Legacy duplicate names receive
deterministic slug suffixes; existing published slugs and display names stay
unchanged. Unusable legacy names receive stable fallback slugs. New registrations
still require unique normalized names. Deploy the matching API, launch worker
and updated clients together. Old contract-ID
URLs are no longer supported. Reputation processing keeps its existing identity
and account identifiers.
