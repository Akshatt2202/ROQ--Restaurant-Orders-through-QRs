import mongoose from "mongoose"

mongoose.Promise = Promise;

/**
 * A cold server instance can take several requests at once, so the connection
 * promise is cached and everyone awaits the same connect() instead of each
 * request opening its own pool.
 */
let connecting: Promise<typeof mongoose> | null = null;

const mongoServer = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) return;

    if (!process.env.MONGO_URI) {
        // Returning quietly here is what makes a missing env var look like a
        // random 500: the caller thinks it is connected, then the first query
        // buffers for 10s and fails with an unrelated-looking timeout.
        throw new Error(
            "MONGO_URI is not set - the database is not configured for this environment"
        );
    }

    if (!connecting) {
        connecting = mongoose.connect(process.env.MONGO_URI).catch((error) => {
            // Don't cache a failure, or every later request inherits it.
            connecting = null;
            throw error;
        });
    }

    // Throwing lets the route return a 500 for this one request. The old
    // process.exit(1) killed the entire server because one connection failed.
    await connecting;
}

export default mongoServer;
