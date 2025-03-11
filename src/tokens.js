const jwt = require("jsonwebtoken");
const configs = require("../configs")();
const {
    preDefinedPermissions,
    getAccountPermissions,
} = require("./models/membership");

const logger = require("./logging/logging")({
    module: module.filename,
    type: "req",
});

// JWT strategy definition
// Generate token
exports.getToken = async function (
    { account },
    override = {},
    shouldExpire = true
) {
    // Get administrator permissions
    let perms = null;
    try {
        perms = await getAccountPermissions(account);
    } catch (err) {
        perms = { ...preDefinedPermissions.none };
        logger.error("Could not get user permissions", {
            params: { administrator: user, message: err.message },
        });
    }

    return jwt.sign(
        {
            aid: account._id,
            username: account.username,
            name: account.name,
            perms: perms,
            ...override,
        },
        configs.get("administratorTokenSecretKey"),
        shouldExpire
            ? { expiresIn: configs.get("accountTokenExpiration", "number") }
            : null
    );
};

exports.getAccessKey = async (
    { account },
    override = {},
    shouldExpire = true
) => {
    const versions = configs.get("versions");
    return jwt.sign(
        {
            type: "app_access_key",
            versions: versions,
            ...override,
        },
        configs.get("administratorTokenSecretKey"),
        shouldExpire
            ? { expiresIn: configs.get("accountTokenExpiration", "number") }
            : null
    );
};

exports.getRefreshToken = async ({ account }, override = {}) => {
    return jwt.sign(
        {
            aid: account._id,
            username: account.username,
            name: account.name,
            ...override,
        },
        configs.get("administratorTokenSecretKey"),
        {
            expiresIn: configs.get("accountRefreshTokenExpiration", "number"),
        }
    );
};

exports.verifyToken = (token) => {
    return jwt.verify(token, configs.get("administratorTokenSecretKey"));
};
