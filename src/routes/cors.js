const configs = require("../../configs")();
const cors = require("cors");

// Whitelist of origins allowed to access resources
const whitelist = configs.get("corsWhiteList", "list");

// CORS handler
var corsOptionsCheck = (req, callback) => {
    var corsOptions = {
        exposedHeaders: ["Refresh-JWT", "refresh-token", "records-total"],
    };
    if (
        req.header("Origin") &&
        whitelist.indexOf(req.header("Origin")) !== -1
    ) {
        // In whitelist, allow the request to be accepted
        corsOptions.origin = true;
    } else {
        // Not in whitelist, don't include allow-origin
        corsOptions.origin = false;
    }
    callback(null, corsOptions);
};

// Operations allowed for * origins
exports.cors = cors({
    exposedHeaders: ["Refresh-JWT", "refresh-token", "records-total"],
});

// Operations allowed for whitelist origins
exports.corsWithOptions = cors(corsOptionsCheck);
