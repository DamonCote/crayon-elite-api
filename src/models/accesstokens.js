const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoConns = require("../mongoConns.js")();
const validators = require("./validators");

/**
 * Access Tokens Schema
 */
const accessTokenSchema = new Schema(
    {
        // user
        user: {
            type: Schema.Types.ObjectId,
            ref: "administrators",
            required: true,
        },
        // access token description
        name: {
            type: String,
            required: true,
            validate: {
                validator: validators.validateTokenName,
                message: "Token name format is invalid",
            },
        },
        // token itself
        token: {
            type: String,
            required: true,
            maxlength: [1024, "Token length must be at most 1024"],
        },
        // is valid. Reserved for future use
        isValid: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// indexing
accessTokenSchema.index({ name: 1, user: 1 }, { unique: true });

// default exports
module.exports = mongoConns
    .getMainDB()
    .model("accesstokens", accessTokenSchema);
