const { version } = require("../package.json");

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const configs = require("../configs")();
const swaggerUI = require("swagger-ui-express");
const yamljs = require("yamljs");
const express = require("express");
const cors = require("./routes/cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { OpenApiValidator } = require("express-openapi-validator");
const openapiRouter = require("./utils/openapiRouter");
const createError = require("http-errors");

const passport = require("passport");
const auth = require("./authenticate");

const logger = require("./logging/logging")({
    module: module.filename,
    type: "req",
});
const { reqLogger, errLogger } = require("./logging/request-logging");

// rate limiter
const rateLimit = require("express-rate-limit");
const RateLimitStore = require("./rateLimitStore");

class ExpressServer {
    constructor(port, securePort, openApiYaml) {
        this.port = port;
        this.securePort = securePort;
        this.app = express();

        this.openApiPath = openApiYaml;
        this.schema = yamljs.load(openApiYaml);
        const restServerUrl = configs.get("restServerUrl", "list");
        const servers = this.schema.servers.filter((server) =>
            server.url.includes(restServerUrl)
        );
        if (servers.length === 0) {
            this.schema.servers.unshift(
                ...restServerUrl.map((restServer, idx) => {
                    return {
                        description: `Local Server #${idx + 1}`,
                        url: restServer + "/api/v1",
                    };
                })
            );
        }

        this.setupMiddleware = this.setupMiddleware.bind(this);
        this.addErrorHandler = this.addErrorHandler.bind(this);
        this.onError = this.onError.bind(this);
        this.onListening = this.onListening.bind(this);
        this.launch = this.launch.bind(this);
        this.close = this.close.bind(this);

        this.setupMiddleware();
    }

    async setupMiddleware() {
        this.app.use((req, res, next) => {
            console.log(`${req.method}： ${req.url}`);
            return next();
        });

        // Request logging middleware - must be defined before routers.
        this.app.use(reqLogger);
        this.app.set("trust proxy", true); // Needed to get the public IP if behind a proxy

        // Don't expose system internals in response headers
        this.app.disable("x-powered-by");

        // Secure traffic only
        this.app.all("*", (req, res, next) => {
            // Allow Let's encrypt certbot to access its certificate dirctory
            if (
                !configs.get("shouldRedirectHttps", "boolean") ||
                req.secure ||
                req.url.startsWith("/.well-known/acme-challenge")
            ) {
                return next();
            } else {
                return res.redirect(
                    307,
                    "https://" +
                        req.hostname +
                        ":" +
                        configs.get("redirectHttpsPort") +
                        req.url
                );
            }
        });

        // Global rate limiter to protect against DoS attacks
        // Windows size of 5 minutes
        const inMemoryStore = new RateLimitStore(5 * 60 * 1000);
        const rateLimiter = rateLimit({
            store: inMemoryStore,
            // Rate limit for requests in 5 min per IP address
            max: configs.get("userIpReqRateLimit", "number"),
            message: "Request rate limit exceeded",
            onLimitReached: (req, res, options) => {
                logger.error("Request rate limit exceeded. blocking request", {
                    params: { ip: req.ip },
                    req: req,
                });
            },
        });
        this.app.use(rateLimiter);

        // General settings here
        this.app.use(cors.cors);
        this.app.use(bodyParser.json());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(cookieParser());

        // Routes allowed without authentication
        this.app.use(
            express.static(path.join(__dirname, configs.get("clientStaticDir")))
        );

        // Secure traffic only
        this.app.all("*", (req, res, next) => {
            // Allow Let's encrypt certbot to access its certificate dirctory
            if (
                !configs.get("shouldRedirectHttps", "boolean") ||
                req.secure ||
                req.url.startsWith("/.well-known/acme-challenge")
            ) {
                return next();
            } else {
                return res.redirect(
                    307,
                    "https://" +
                        req.hostname +
                        ":" +
                        configs.get("redirectHttpsPort") +
                        req.url
                );
            }
        });

        // no authentication
        this.app.use(
            "/api/v1/authentication",
            require("./routes/authentication")
        );

        // add API documentation
        this.app.use(
            "/api-docs",
            swaggerUI.serve,
            swaggerUI.setup(this.schema)
        );

        // initialize passport and authentication
        this.app.use(passport.initialize());

        // Enable routes for non-authorized links
        this.app.use(
            "/ok",
            express.static(path.join(__dirname, "public", "ok.html"))
        );
        this.app.use(
            "/spec",
            express.static(path.join(__dirname, "api", "openapi.yaml"))
        );
        this.app.get("/hello", (req, res) => res.send("Hello World"));

        this.app.get("/api/version", (req, res) => res.json({ version }));

        this.app.use(cors.corsWithOptions);
        this.app.use(auth.verifyAccountJWT);

        const validator = new OpenApiValidator({
            apiSpec: this.openApiPath,
            validateRequests: configs.get("validateOpenAPIRequest", "boolean"),
            validateResponses: configs.get(
                "validateOpenAPIResponse",
                "boolean"
            ),
        });

        validator.install(this.app).then(async () => {
            await this.app.use(openapiRouter(this.schema.components.schemas));
            await this.launch();
            logger.info("Express server running");
        });
    }

    // "catchall" handler, for any request that doesn't match one above, send back index.html file.
    addErrorHandler() {
        this.app.get("*", (req, res, next) => {
            logger.info("Route not found", { req: req });
            res.sendFile(
                path.join(
                    __dirname,
                    configs.get("clientStaticDir"),
                    "index.html"
                )
            );
        });

        // catch 404 and forward to error handler
        this.app.use(function (req, res, next) {
            next(createError(404));
        });

        // Request error logger - must be defined after all routers
        // Set log severity on the request to log errors only for 5xx status codes.
        this.app.use((err, req, res, next) => {
            req.logSeverity = err.status || 500;
            next(err);
        });
        this.app.use(errLogger);

        /**
         * suppressed eslint rule: The next variable is required here, even though it's not used.
         *
         ** */
        // eslint-disable-next-line no-unused-vars
        this.app.use((error, req, res, next) => {
            const errorResponse =
                error.error || error.message || error.errors || "Unknown error";
            res.status(error.status || 500);
            res.type("json");
            res.json({ error: errorResponse });
        });
    }

    /**
     * Event listener for HTTP server "listening" event.
     */
    onListening(server) {
        return function () {
            const addr = server.address();
            const bind =
                typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
            console.debug("listening " + bind);
        };
    }

    async launch() {
        this.addErrorHandler();

        try {
            this.server = http.createServer(this.app);

            this.options = {
                key: fs.readFileSync(
                    path.join(__dirname, configs.get("httpsCertKey"))
                ),
                cert: fs.readFileSync(
                    path.join(__dirname, configs.get("httpsCert"))
                ),
            };
            this.secureServer = https.createServer(this.options, this.app);

            this.server.listen(this.port, () => {
                console.log("HTTP server listening on port", {
                    params: { port: this.port },
                });
            });
            this.server.on("error", this.onError(this.port));
            this.server.on("listening", this.onListening(this.server));

            this.secureServer.listen(this.securePort, () => {
                console.log("HTTPS server listening on port", {
                    params: { port: this.securePort },
                });
            });
            this.secureServer.on("error", this.onError(this.securePort));
            this.secureServer.on(
                "listening",
                this.onListening(this.secureServer)
            );
        } catch (error) {
            console.log("Express server lunch error", {
                params: { message: error.message },
            });
        }
    }

    /**
     * Event listener for HTTP/HTTPS server "error" event.
     */
    onError(port) {
        return function (error) {
            if (error.syscall !== "listen") {
                throw error;
            }

            const bind = "Port " + port;

            // handle specific listen errors with friendly messages
            /* eslint-disable no-unreachable */
            switch (error.code) {
                case "EACCES":
                    console.error(bind + " Need to upgrade permissions");
                    process.exit(1);
                    break;
                case "EADDRINUSE":
                    console.error(bind + " Already in use");
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        };
    }

    async close() {
        if (this.server !== undefined) {
            await this.server.close();
            console.log(`HTTP Server on port ${this.port} shut down`);
        }
        if (this.secureServer !== undefined) {
            await this.secureServer.close();
            console.log(`HTTPS Server on port ${this.securePort} shut down`);
        }
    }
}

module.exports = ExpressServer;
