class MemoryStore {
    constructor(windowMs) {
        this.windowMs = windowMs;
        this.hits = {};
        this.resetTime = this.calculateNextResetTime();
        this.periodicResetInterval();
    }

    incr(key, cb) {
        if (this.hits[key]) {
            this.hits[key]++;
        } else {
            this.hits[key] = 1;
        }

        cb(null, this.hits[key], this.resetTime);
    }

    decrement(key) {
        if (this.hits[key]) {
            this.hits[key]--;
        }
    }

    // export an API to allow hits all IPs to be reset
    resetAll() {
        this.hits = {};
        this.resetTime = this.calculateNextResetTime();
    }

    // export an API to allow hits from one IP to be reset
    resetKey(key) {
        delete this.hits[key];
    }

    // export an API to allow retrieving hits of a specific key
    getHitsByKey(key) {
        return this.hits[key];
    }

    periodicResetInterval() {
        const interval = setInterval(this.resetAll.bind(this), this.windowMs);
        if (interval.unref) {
            interval.unref();
        }
    }

    calculateNextResetTime() {
        const d = new Date();
        d.setMilliseconds(d.getMilliseconds() + this.windowMs);
        return d;
    }
}

module.exports = MemoryStore;
