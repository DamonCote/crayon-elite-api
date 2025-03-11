const configs = require("../configs")();
const mongoose = require("mongoose");
const logger = require("./logging/logging")({
    module: module.filename,
    type: "mongodb",
});

class MongoConns {
    constructor() {
        this.getMainDB = this.getMainDB.bind(this);
        const mongoUrl = configs.get("mongoUrl");
        const mongoAuth = configs.get("mongoAuth");
        this.mainDB = mongoose.createConnection(mongoUrl, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            ...mongoAuth,
        });
        this.mainDB.then(
            (db) => {
                logger.info("Connected to MongoDB mainDB");
            },
            (err) => {
                logger.error("Failed to connect to mainDB", {
                    params: { err: err.message },
                });
            }
        );
    }

    /**
     * Run session based operation with the main database
     * @async
     * @param  {Function} func          Async function to be called as part of the transaction,
     *                                  this function get the session as a parameter
     * @param  {Boolean}  closeSession  Whether to end the session when the transaction completed
     *                                  or allow to the caller to close the session
     *                                  This is needed if some transaction objects are still used
     *                                  after the transaction completed
     * @param  {Number}   times         How many times to try in case of WriteConflict Mongo error
     * @return {Object}   session used  The session used, if closeSession is false, the session will
     *                                  be provided to the caller to close the session
     */
    async mainDBwithTransaction(func, closeSession = true, times = 3) {
        let execNum = 0;
        let session;
        try {
            session = await this.mainDB.startSession();
            await session.withTransaction(async () => {
                // Prevent infinite loop, if more than 'times' transient errors (writeConflict), exit
                execNum += 1;
                if (execNum > times) {
                    throw new Error(
                        `Error writing to database, too many attempts (${times})`
                    );
                }
                await func(session);
            });
        } finally {
            // This creates an issue with some updates, need to understand why
            if (closeSession && session) session.endSession();
        }
        return session;
    }

    getMainDB() {
        return this.mainDB;
    }
}

var mongoConns = null;
module.exports = function () {
    if (mongoConns) return mongoConns;
    else {
        mongoConns = new MongoConns();
        return mongoConns;
    }
};
