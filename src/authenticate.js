const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const { permissionMasks } = require("./models/membership");
const Administrators = require("./models/administrators");
const Accesstoken = require("./models/accesstokens");
const { verifyToken, getToken } = require("./tokens");
const { promiseFn } = require("./utils/helper");

const configs = require("../configs")();
const createError = require("http-errors");
const logger = require("./logging/logging")({
    module: module.filename,
    type: "req",
});
var jwt = require("jsonwebtoken");

// Serialize username and password to the user model
passport.serializeUser(Administrators.serializeUser());
passport.deserializeUser(Administrators.deserializeUser());

// Define local authentication strategy
exports.localPassport = passport.use(
    new LocalStrategy(
        { usernameField: "username" },
        async (username, password, done) => {
            const [error, result] = await promiseFn(() =>
                Administrators.findOne({ username })
            );
            if (error) {
                return done(null, false, { message: error });
            } else {
                if (result) {
                    const match = password === result.password;
                    if (match) {
                        return done(null, result);
                    } else {
                        return done(null, false, {
                            message: "Password or Username is incorrect",
                        });
                    }
                } else {
                    return done(null, false, {
                        message: "Password or Username is incorrect",
                    });
                }
            }
        }
    )
);

// Define JWT authentication strategy
const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = configs.get("administratorTokenSecretKey");

exports.jwtPassport = passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
        // check if aid exists on payload
        if (!jwtPayload.aid) {
            return done(null, false, { message: "Invalid token" });
        }

        // check if token exists
        let token = null;
        if (
            jwtPayload.type === "app_access_token" ||
            jwtPayload.type === "app_access_key"
        ) {
            try {
                token = await Accesstoken.findOne({ _id: jwtPayload.aid });
                if (!token) {
                    return done(null, false, { message: "Invalid token used" });
                }
            } catch (error) {
                return done(new Error(error.message), false);
            }
        }

        Administrators.findOne({ _id: jwtPayload.aid }).exec(
            async (err, administrator) => {
                if (err) {
                    return done(err, false);
                } else if (administrator) {
                    const res = await setAccountPerms(
                        administrator,
                        jwtPayload,
                        token
                    );
                    return res === true
                        ? done(null, administrator)
                        : done(null, false, { message: "Invalid Token" });
                } else {
                    done(null, false, { message: "Invalid Token" });
                }
            }
        );
    })
);

const setAccountPerms = async (administrator, jwtPayload, token = null) => {
    const isAccessToken = ["app_access_key", "app_access_token"].includes(
        jwtPayload.type
    );
    const isValidAccount = administrator._id.toString() === jwtPayload.aid;

    if (!isAccessToken && !isValidAccount) return false;

    administrator.accessToken = isAccessToken;
    administrator.jwtAid = jwtPayload.aid;
    administrator.perms = jwtPayload.perms;

    // override account default account with account stored on jwtPayload
    if (isAccessToken) {
        const administratorInfo = await Administrators.findOne({
            _id: jwtPayload.aid,
        });

        if (!administratorInfo) {
            logger.warn("Could not find administrator by jwt payload", {
                params: { jwtPayload: jwtPayload },
            });

            return false;
        }
        // retrieve permissions from token
        if (jwtPayload.type === "app_access_key") {
            administrator.perms = token.permissions;
        }
    }

    return true;
};

// Authentication verification for local and JWT strategy, and populate req.user
exports.verifyAccountLocal = async function (req, res, next) {
    // Continue with verifying password
    passport.authenticate(
        "local",
        { session: false },
        async (err, account, info) => {
            if (err || !account) {
                const [errMsg, status, responseMsg] = err
                    ? [err.message, 500, "Internal server error"]
                    : [info.message, 401, info.message];

                logger.warn("Administrator authentication failed", {
                    params: {
                        account: req.body.username,
                        err: (err || info).name,
                        message: errMsg,
                    },
                    req: req,
                });
                return res.status(500).json({
                    status: false,
                    message: responseMsg,
                    error_reason: {
                        key: "INVALID_CREDENTIALS",
                    },
                });
            } else {
                if (account.state !== 1) {
                    return next(
                        createError(
                            400,
                            "Administrator not verified, check your state"
                        )
                    );
                } else {
                    req.account = account;
                    req.aid = account.id;
                    return next();
                }
            }
        }
    )(req, res, next);
};

exports.verifyAccountJWT = function (req, res, next) {
    // Allow options to pass through without verification for preflight options requests
    if (req.method === "OPTIONS") {
        logger.debug("verifyAccountJWT: OPTIONS request");
        return next();
        // Check if an API call
    } else if (req.url.startsWith("/api")) {
        passport.authenticate(
            "jwt",
            { session: false },
            async (err, account, info) => {
                if (err || !account) {
                    // If the JWT token has expired, but the request
                    // contains a valid refresh token, accept the request
                    // and attach a new token to the response.
                    // TBD: Maintain refresh tokens in database and add
                    // check also if the refresh token hasn't been revoked.
                    if (
                        info &&
                        info.name === "TokenExpiredError" &&
                        req.headers["refresh-token"]
                    ) {
                        try {
                            const refreshToken = req.headers["refresh-token"];
                            await verifyToken(refreshToken);
                            const decodedToken = jwt.decode(refreshToken);
                            const accountDetails = await Administrators.findOne(
                                {
                                    _id: decodedToken._id,
                                }
                            );

                            // Don't return a token if user was deleted
                            // since the refresh token has been issued.
                            if (!accountDetails) return next(createError(401));

                            // Attach the token to the headers and let
                            // the request continue to the next middleware.
                            req.account = accountDetails;
                            const token = await getToken(req);
                            res.setHeader("Refresh-JWT", token);

                            // Manually set the user details and permissions
                            // since passport's JWT strategy callback will not
                            // be called.
                            const jwtPayload = jwt.decode(token);
                            await setAccountPerms(accountDetails, jwtPayload);
                            account = accountDetails;
                        } catch (err) {
                            if (req.header("Origin") !== undefined) {
                                res.setHeader(
                                    "Access-Control-Allow-Origin",
                                    req.header("Origin")
                                );
                            }
                            if (err.name === "TokenExpiredError") {
                                logger.info("Account refresh token expired", {
                                    params: { err: err.message },
                                    req: req,
                                });
                                return next(
                                    createError(401, "session expired")
                                );
                            }
                            logger.warn("Account token refresh failed", {
                                params: { err: err.message },
                                req: req,
                            });
                            return err.name === "MongoError"
                                ? next(createError(500))
                                : next(createError(401));
                        }
                    } else {
                        if (req.header("Origin") !== undefined) {
                            res.setHeader(
                                "Access-Control-Allow-Origin",
                                req.header("Origin")
                            );
                        }
                        const [errMsg, status, responseMsg] = err
                            ? [err.message, 500, "Internal server error"]
                            : [info.message, 401, info.message];

                        logger.warn("JWT verification failed", {
                            params: { err: errMsg },
                            req: req,
                        });
                        return next(createError(status, responseMsg));
                    }
                }
                // Set refresh JWT to empty if a new token was not generated,
                // update later if necessary. If not set Firefox bug uses garbage value.
                if (!res.getHeaders()["refresh-jwt"]) {
                    res.setHeader("Refresh-JWT", "");
                }
                req.account = account;
                // Add accountId to the request for logging purposes.
                req.aid = account._id;

                return next();
            }
        )(req, res, next);
    } else {
        // For non API calls, continue
        return next();
    }
};

/**
 * Check account is admin,allow access to admin accounts only
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.verifyAdmin = function (req, res, next) {
    return !req.account ? next(createError(403, "not authorized")) : next();
};

/**
 * Function to verify access permission
 * @param {Object} accessType - what is accessed (billing, account, organization, ...)
 * @param {Object} restCommand - string of get, post, put, del
 * Return middleware to check permissions for that type
 */
exports.verifyPermission = function (accessType, restCommand) {
    return function (req, res, next) {
        if (req.account.perms[accessType] & permissionMasks[restCommand]) {
            return next();
        }
        next(
            createError(
                403,
                "You don't have permission to perform this operation"
            )
        );
    };
};

exports.verifyPermissionEx = function (
    serviceName,
    { method, account, openapi }
) {
    // const accessType = serviceName.replace("Service", "").toLowerCase();
    let restCommand = method.toLowerCase();

    // below is a hotfix for membership permissions
    switch (restCommand) {
        case "delete":
            restCommand = "del";
            break;
        case "patch":
            restCommand = "post";
            break;
    }

    if (restCommand === "delete") {
        restCommand = "del";
    }
    if (restCommand === "patch") {
    }
    return permissionMasks[restCommand];
    // return account.perms[accessType] & permissionMasks[restCommand];
};

exports.validatePassword = function (password) {
    return password !== null && password !== undefined && password.length >= 8;
};
