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
    /**
     * Get IP address from request
     * @param {*} req
     * @returns
     */
    const getIP = ({ headers = {}, ip = "", connection = {}, socket = {} }) => {
        try {
            let clientIp =
                headers["x-forwarded-for"] ||
                ip ||
                connection.remoteAddress ||
                socket.remoteAddress ||
                connection.socket.remoteAddress;
            clientIp = clientIp.replace("::ffff:", "");
            const arrayIPs = clientIp.split(",");
            if (arrayIPs.length > 1) {
                clientIp = arrayIPs[0]; // First ip is the client ip
            }
            return clientIp;
        } catch (error) {
            return ip || "";
        }
    };

    return {
        randomNumber,
        getNow,
        promiseFn,
        getIP,
    };
})();

module.exports = utilHelper;
