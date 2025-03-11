const path = require("path");
const configs = require("../configs")();
const logger = require("./logging/logging")({
    module: module.filename,
    type: "req",
});

const ExpressServer = require("./expressserver");

const launchServer = async () => {
    try {
        const openapiYaml = path.join(__dirname, "../api", "openapi.yaml");
        const httpPort = configs.get("httpPort");
        const httpsPort = configs.get("httpsPort");
        this.expressServer = new ExpressServer(
            httpPort,
            httpsPort,
            openapiYaml
        );
    } catch (error) {
        console.error(error);
        await this.expressServer.close();
    }
};

launchServer().catch((e) => logger.error(e));
