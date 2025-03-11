class Service {
    static rejectResponse(error, code = 500, errorKey = null) {
        return {
            status: false,
            message: error,
            error_reason: {
                code,
                key: errorKey,
            },
        };
    }

    static rejectError(error) {
        const {
            httpCode = 500,
            error_reason = "invalid",
            status,
            ...errorWithoutHttpCode
        } = error;

        return {
            code: httpCode,
            status,
            error_reason: {
                ...errorWithoutHttpCode,
                key: error_reason.toUpperCase(),
            },
        };
    }
    static successResponse(payload, code = 0) {
        return { status: true, ...payload };
    }
}

module.exports = Service;
