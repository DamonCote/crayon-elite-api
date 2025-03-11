require("winston-mongodb");
const os = require("os");
const configs = require("../../configs")();
const mapValues = require("lodash/mapValues");
const isPlainObject = require("lodash/isPlainObject");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, json, colorize, printf } = format;
const maxLevelLength = "verbose".length; // Used for log header alignment

// Env specific information
const hostname = os.hostname();
/**
 * Creates an object with data about the request.
 * @param  {Object} req express request object
 * @return {Object}     request log header object
 */
const createRequestEntry = (req) => {
    return req
        ? {
              reqId: req.id,
              user: req.userId || "",
              ip: req.ip,
              method: req.method,
              url: req.url,
          }
        : {};
};

/**
 * Creates an object with data about the host.
 * @return {Object} host log entry object
 */
const createEnvEntry = () => {
    return {
        hostname: hostname,
    };
};

/**
 * Creates a formated application log entry
 * that contains log headers and log data.
 * @param  {Object} info winston logger info object
 * @return {Object}      formatted log entry
 */
const createLogEntry = (info) => {
    const logEntry = {};
    const logType = info.header.type;

    // Global log fields
    logEntry.level = info.level;
    logEntry.module = info.header.module;
    logEntry.type = logType;
    logEntry.env = createEnvEntry();

    // Event type additional fields
    logEntry.req = createRequestEntry(info.ctx.req);

    // Event message + data
    logEntry.event = {
        message: info.message,
        params: info.ctx.params ? info.ctx.params : {},
    };

    return logEntry;
};

const fileLogFormat = combine(
    format((info) => {
        info = createLogEntry(info);
        return info;
    })(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    json()
);

const consolLogFormat = combine(
    format((info) => {
        info.level =
            info.level.toUpperCase() +
            Array(maxLevelLength - info.level.length).join(" ");
        info.params = info.ctx.params
            ? `, params: ${JSON.stringify(info.ctx.params)}`
            : "";
        return info;
    })(),
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    printf(
        (info) =>
            `[${info.timestamp}, ${info.level}]: ${info.message}${info.params}`
    )
);
/**
 * A factory method for creating a logger based
 * on the environment on which the code runs.
 * @param  {string} env environment name
 * @return {Object}     winston logger object
 */
const loggerFactory = (env) => {
    if (env === "development") {
        const logger = createLogger({
            level: configs.get("logLevel"),
            transports: [
                new transports.File({
                    filename: configs.get("logFilePath"),
                    format: fileLogFormat,
                    maxsize: "300000000", // Max file size is 300MB
                    maxFiles: "5",
                    tailable: true,
                }),
                new transports.Console({ format: consolLogFormat }),
            ],
        });
        return logger;
    } else if (env === "testing") {
        // Use console.log() in unit tests, as winston logger
        // throws errors when used in unit tests.
        const testLogger = (msg, ctx = {}) => {
            console.log(msg.message);
        };
        const testLoggerObj = {
            error: testLogger,
            warn: testLogger,
            info: testLogger,
            verbose: testLogger,
            debug: testLogger,
            silly: testLogger,
        };
        return testLoggerObj;
    }

    // Default logger for any other environment
    const logger = createLogger({
        level: configs.get("logLevel"),
        transports: [
            new transports.File({
                filename: configs.get("logFilePath"),
                format: fileLogFormat,
                maxsize: "300000000", // Max file size is 300MB
                maxFiles: "5",
                tailable: true,
            }),
        ],
    });
    return logger;
};

let logger = null;
/**
 * A singleton that creates the application logger
 * @return {Object} a winston logger
 */
const getLogger = () => {
    if (!logger) logger = loggerFactory(configs.get("environment"));
    return logger;
};
/**
 * @param  {{module: string, type: string}} header an object passed to the 'require' statement
 * @return {void}
 */
const enforceHeaderFields = (header) => {
    if (!(header.hasOwnProperty("module") && header.hasOwnProperty("type"))) {
        throw new Error(
            "Not all header fields are passed when a logger is required."
        );
    }
};

/**
 * Convert a logging message into pure javascript object
 * @param   {Object} obj (e.g. mongodb model)
 * @returns {Object} pure javascript object
 */
const deepObjectConvert = (obj) => {
    return obj
        ? obj.toJSON
            ? obj.toJSON()
            : isPlainObject(obj)
            ? mapValues(obj, deepObjectConvert)
            : Array.isArray(obj)
            ? obj.map(deepObjectConvert)
            : obj
        : obj;
};

module.exports = function (header) {
    // Enforce passing global header fields upon requiring the log.
    // This code throws if not all mandatory fields are passed
    enforceHeaderFields(header);

    return {
        error: function (msg, ctx = {}) {
            getLogger().error({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
        warn: function (msg, ctx = {}) {
            getLogger().warn({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
        info: function (msg, ctx = {}) {
            getLogger().info({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
        verbose: function (msg, ctx = {}) {
            getLogger().verbose({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
        debug: function (msg, ctx = {}) {
            getLogger().debug({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
        silly: function (msg, ctx = {}) {
            getLogger().silly({
                message: msg,
                ctx: deepObjectConvert(ctx),
                header: header,
            });
        },
    };
};
