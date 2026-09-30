# Lumenrise API

The only client-facing service. It owns HTTP routes, wallet authentication and sessions, OAuth callbacks, connection changes, manual refresh requests, policy evaluation, and responses derived from stored MongoDB data.

For GitHub and X refreshes, the API writes a durable `IntegrationSyncJob` to MongoDB and publishes its ID to RabbitMQ. For Stellar activity, it writes a `StellarActivityScan` and publishes its ID. The [Reputation service](../lumenrise-reputation/README.md) consumes those queues, performs provider collection and scoring, and polls MongoDB for due jobs if a RabbitMQ wakeup is missed. Soroban evidence lookup also runs there.

Both services connect to the same MongoDB database and use matching Mongoose models. Run `npm run check:model-parity` in the Reputation repository after changing a shared model. The token launch service is a later stage.

GitHub and X refresh are manual only, with a 15-minute minimum interval per identity. Scores from a disconnected or previous provider account are unavailable, as are scores older than 90 days. A partial score retains `status: partial`; a failed refresh remains visible through its job status. See the [Reputation operations guide](../lumenrise-reputation/docs/operations.md) for deployment order, retention, Stellar evidence semantics, and recovery.
