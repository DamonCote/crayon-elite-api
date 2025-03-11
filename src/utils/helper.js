const { DateTime } = require("luxon");

const utilHelper = (() => {
    const randomNumber = (max = 1, min = 0) => {
        if (min >= max) {
            [min, max] = [max, min];
        }

        return Math.floor(Math.random() * (max - min) + min);
    };
    const getNow = () => DateTime.now().toUnixInteger();

    /**
     * Running a function and return a promise
     * @param {*} fn function to run
     * @returns {Promise} promise
     */
    const promiseFn = async (fn) => {
        const promise = new Promise((resolve, reject) => {
            try {
                const result = fn();
                resolve(result);
            } catch (error) {
                reject([error]);
            }
        });
        return promise
            .then((data) => {
                return [null, data];
            })
            .catch((err) => [err]);
    };

    return {
        randomNumber,
        getNow,
        promiseFn,
    };
})();

module.exports = utilHelper;
