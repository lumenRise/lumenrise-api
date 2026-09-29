# Lumenrise API

The only client-facing service. It owns HTTP routes, wallet authentication and sessions, OAuth callbacks, connection changes, manual refresh requests, policy evaluation, and responses derived from stored MongoDB data.

For GitHub and X refreshes, the API writes a durable `IntegrationSyncJob` to MongoDB and publishes its ID to RabbitMQ. For Stellar activity, it writes a `StellarActivityScan` and publishes its ID. The [Reputation service](../lumenrise-reputation/README.md) consumes those queues, performs provider collection and scoring, and polls MongoDB for due jobs if a RabbitMQ wakeup is missed. Soroban evidence lookup and the automatic X schedule also run there.

Both services connect to the same MongoDB database and use matching Mongoose models. Run `npm run check:model-parity` in the Reputation repository after changing a shared model. The token launch service is a later stage.
