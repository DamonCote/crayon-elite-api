const email = require("isemail");
const urlValidator = require("valid-url");
const filenamify = require("filenamify");
const phoneUtil =
    require("google-libphonenumber").PhoneNumberUtil.getInstance();

// Helper functions
const isEmpty = (val) => {
    return val === null || val === undefined;
};
const isValidURL = (url) => {
    return urlValidator.isUri(url) !== undefined;
};
const isValidFileName = (name) => {
    return !isEmpty(name) && name !== "" && filenamify(name) === name;
};
const validateIsInteger = (val) => Number.isInteger(+val);

const validateIsPhoneNumber = (number) => {
    try {
        if (isEmpty(number) || number === "") return false;
        return phoneUtil.isValidNumber(phoneUtil.parse(number));
    } catch (err) {}
};

const validateDescription = (desc) => {
    return (
        desc === "" ||
        /^[a-z0-9-_ .!#%():：（）！，。、@[\]]{1,50}$/i.test(desc || "")
    );
};

const validateURL = (url) => {
    return !isEmpty(url) && isValidURL(url);
};
const validateFileName = (name) => {
    return isValidFileName(name);
};
const validateFieldName = (name) => {
    return /^[a-z0-9-. ]{1,100}$/i.test(name || "");
};
const validateUserName = (name) => {
    return (
        !isEmpty(name) &&
        (email.validate(name) || /^[a-z0-9-. ]{2,15}$/i.test(name))
    );
};
const validateEmail = (mail) => {
    return !isEmpty(mail) && email.validate(mail);
};

const validateTokenName = (name) => {
    return /^[a-z0-9-_ .!#%():@[\]]{3,15}$/i.test(name || "");
};
module.exports = {
    validateTokenName,
    validateDescription,
    validateURL,
    validateFileName,
    validateFieldName,
    validateUserName,
    validateEmail,
    validateIsPhoneNumber,
    validateIsInteger,
};
