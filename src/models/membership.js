const configs = require("../../configs")();
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoConns = require("../mongoConns.js")();
const logger = require("../logging/logging")({
    module: module.filename,
    type: "req",
});

// Permissions bit masks
const permissionMasks = {
    get: 0x1,
    post: 0x2,
    put: 0x4,
    del: 0x8,
};
const permissionShifts = {
    get: 0,
    post: 1,
    put: 2,
    del: 3,
};

// Each value is 1 or 0 based if API is allowed or not respectively
const setPermission = (get, post, put, del) => {
    return (
        ((get << permissionShifts.get) & permissionMasks.get) +
        ((post << permissionShifts.post) & permissionMasks.post) +
        ((put << permissionShifts.put) & permissionMasks.put) +
        ((del << permissionShifts.del) & permissionMasks.del)
    );
};

const managerDelPermission = () =>
    configs.get("allowManagerToDel", "boolean") ? 1 : 0;

// Permissions
// Each number is a bitmask of permissions for Del (MSB), Put, Post, Get (LSB)
const Permissions = new Schema({
    jobs: {
        type: Number,
        min: [0, "Permission too low"],
        max: [15, "Permission too high"],
    },
    devices: {
        type: Number,
        min: [0, "Permission too low"],
        max: [15, "Permission too high"],
    },
    tokens: {
        type: Number,
        min: [0, "Permission too low"],
        max: [15, "Permission too high"],
    },
    accesstokens: {
        type: Number,
        min: [0, "Permission too low"],
        max: [15, "Permission too high"],
    },
});

// Predefined permissions
const preDefinedPermissions = {
    none: {
        tokens: setPermission(0, 0, 0, 0),
        accesstokens: setPermission(0, 0, 0, 0),
    },
    manager: {
        tokens: setPermission(1, 1, 1, managerDelPermission()),
        accesstokens: setPermission(1, 1, 1, 1),
    },
};

/**
 * Membership Database Schema
 */
const Membership = new Schema({
    // user Id
    administrator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "administrators",
    },
    // default roles are 'manager'
    role: {
        type: String,
        required: false,
        unique: false,
        maxlength: [10, "role length must be at most 10"],
    },
    // permissions
    perms: Permissions,
});

const membership = mongoConns.getMainDB().model("membership", Membership);

/**
 * Return the best permissions for this account for the default account and organization
 * @param {Object} account model populated with default account and organization
 */
const getAccountPermissions = (account) => {
    const p = new Promise((resolve, reject) => {
        const perms = { ...preDefinedPermissions.none };

        if (!account || !account._id) {
            return resolve(perms);
        }

        // Get all relevant memberships
        const options = {
            administrator: account._id,
        };

        membership
            .find(options)
            .then((mems) => {
                if (mems && mems.length > 0) {
                    mems.forEach((mem) => {
                        // Loop on all permission types
                        Object.entries(mem.perms.toObject()).forEach(
                            ([type, value]) => {
                                if (type !== "_id" && value > perms[type])
                                    perms[type] = value;
                            }
                        );
                    });
                }
                return resolve(perms);
            })
            .catch((err) => {
                logger.error("Unable to get user permissions", {
                    params: { message: err.message },
                });
                return reject(new Error("Unable to get user permissions"));
            });
    });
    return p;
};

// Default exports
module.exports = {
    membership: membership,
    permissionMasks: permissionMasks,
    permissionShifts: permissionShifts,
    permissionsSchema: Permissions,
    setPermission: setPermission,
    preDefinedPermissions: preDefinedPermissions,
    getAccountPermissions: getAccountPermissions,
};
