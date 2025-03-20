const validators = require("./validators");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");
const mongoConns = require("../mongoConns")();

const loginedSchema = new Schema({
    logined_at: {
        type: Number,
        default: 0,
    },
    ip: {
        type: String,
    },
});

/**
 * Administrator schema
 */
const Administrator = new Schema({
    firstname: {
        type: String,
        required: true,
        validate: {
            validator: validators.validateUserName,
            message:
                "should be a valid first name (English chars, digits, space or -.)",
        },
    },
    lastName: {
        type: String,
        required: true,
        validate: {
            validator: validators.validateUserName,
            message:
                "should be a valid last name (English chars, digits, space or -.)",
        },
    },
    username: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: validators.validateUserName,
            message: "should be a valid user name as email",
        },
    },
    // phone number
    phone: {
        type: String,
        validate: {
            validator: (number) => {
                return (
                    number === "" || validators.validateIsPhoneNumber(number)
                );
            },
            message: "should be a valid phone number",
        },
        maxlength: [20, "Phone number length must be at most 20"],
    },
    // email address
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: [255, "Email length must be at most 255"],
        validate: {
            validator: validators.validateEmail,
            message: "should be a valid email address",
        },
    },
    password: {
        type: String,
        maxlength: 50,
        required: false,
        default: "",
    },
    // user state
    state: {
        type: Number,
        default: 0,
    },
    logined: {
        type: loginedSchema,
    },
});

// use for maximum attempts protection
const maxInterval = 30000; // 5 minutes
const options = {
    limitAttempts: true,
    maxInterval: maxInterval,
    errorMessages: {
        // eslint-disable-next-line max-len
        AttemptTooSoonError: `Too many login attempts. try again in ${Math.floor(
            maxInterval / 6000
        )} minutes`,
    },
};

// enable mangoose plugin for local authenticaiton
Administrator.plugin(passportLocalMongoose, options);

// Default exports
module.exports = mongoConns.getMainDB().model("administrators", Administrator);
