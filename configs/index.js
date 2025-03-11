const configEnv = {
    default: {
        administratorTokenSecretKey: "crayon",
        httpPort: 8008,
        httpsPort: 8443,
        accountRefreshTokenExpiration: 86400,
        accountTokenExpiration: 1800,
        logLevel: "debug",
        logFilePath: "./runtime/logs/app.log",
        reqLogFilePath: "./runtime/logs/req.log",
        mongoUrl: "mongodb://127.0.0.1:27017/crayon-local",
        mongoAuth: {},
        restServerUrl: ["https://api-local.crayon.evoart.ai"],
        uiServerUrl: ["https://api-local.crayon.evoart.ai:3000"],
        corsWhiteList: [],
        apiAccessKey: "crayon",
        clientStaticDir: "./runtime/build",
        shouldRedirectHttps: true,
        allowManagerToDel: true,
        // Whether to validate open API response. True for testing and dev, False for production,
        // to remove unneeded fields from the response, use validateOpenAPIResponse = { removeAdditional: 'failing' }
        validateOpenAPIResponse: false,
        // Whether to validate open API request, now False for all.
        // Not described in schema fields will be removed if true,
        validateOpenAPIRequest: false,
        // Number of REST requests allowed in 5 min per IP address, more requests will be rate limited
        userIpReqRateLimit: 300,
        // Certificate key location, under bin directory
        // On production if the key located in the Let's encrypt directory, it's possible to link to it using:
        httpsCertKey: "../configs/ssl/local/api-local.crayon.evoart.ai-key.pem",
        // Certificate location, under bin directory
        // On production if the key located in the Let's encrypt directory, it's possible to link to it using:
        httpsCert: "../configs/ssl/local/api-local.crayon.evoart.ai.pem",
    },
    development: {},
    production: {
        httpPort: 80,
        httpsPort: 443,
        mongoUrl: "mongodb://127.0.0.1:27017/crayon?authMechanism=DEFAULT",
        mongoAuth: {
            user: "admin",
            pass: "testCrayon",
            authSource: "admin",
        },
        restServerUrl: ["https://api.crayon.evoart.ai"],
        corsWhiteList: ["https://api.crayon.evoart.ai"],
        httpsCertKey: "../configs/ssl/api.crayon.evoart.ai.key",
        httpsCert: "../configs/ssl/api.crayon.evoart.ai.crt",
    },
    testing: {},
};

class Configs {
    constructor(_env) {
        const environment = this.getEnv();
        const combinedConfig = {
            ...configEnv.default,
            ...configEnv[environment],
            environment: environment,
        };
        this.config_values = combinedConfig;
        console.log(
            "Configuration used:\n" +
                JSON.stringify(this.config_values, null, 2)
        );
    }

    getEnv() {
        const envConfig = process.env || {
            NODE_ENV: "development",
        };
        return envConfig.NODE_ENV;
    }

    get(key, type = "string") {
        if (typeof this.config_values[key] === "string") {
            try {
                switch (type) {
                    case "string":
                        return this.config_values[key];
                    case "number":
                        return +this.config_values[key];
                    case "list":
                        return this.config_values[key].split(/,\s*/);
                    case "boolean":
                        if (this.config_values[key].toLowerCase() === "true") {
                            return true;
                        } else if (
                            this.config_values[key].toLowerCase() === "false"
                        ) {
                            return false;
                        } else throw new Error("Not a boolean value");
                }
            } catch (err) {
                // the configs module is used by logger, so just console error
                console.error("Could not convert config param", {
                    params: {
                        key: key,
                        value: this.config_values[key],
                        message: err.message,
                    },
                });
            }
        }
        return this.config_values[key];
    }

    getAll() {
        return this.config_values;
    }
}

let configs = null;
module.exports = function (env = null) {
    if (configs) return configs;
    else {
        configs = new Configs(env);
        return configs;
    }
};
