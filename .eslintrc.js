module.exports = {
    root: true,
    parserOptions: {
        parser: "babel-eslint",
    },
    env: {
        browser: true,
    },
    rules: {
        indent: ["off", 2],
        quotes: [0, "single"],
        "no-mixed-spaces-and-tabs": [2, false],
        "generator-star-spacing": "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
        "space-before-function-paren": "off",
        "no-var": "off",
        "no-new-func": "error",
        camelcase: [0, { properties: "never" }],
        "comma-dangle": ["error", "only-multiline"],
        semi: [2, "always"],
        "prettier/prettier": [
            "off",
            {
                singleQuote: false,
                semi: false,
                trailingComma: "none",
                bracketSpacing: true,
                jsxBracketSameLine: true,
            },
        ],
    },
};
