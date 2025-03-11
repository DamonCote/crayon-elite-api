module.exports = {
    apps: [
        {
            name: "crayon-elite-service",
            script: "./src/start.js",
            merge_logs: true,
            max_restarts: 20,
            instances: 1,
            max_memory_restart: "2G",
            env: {
                NODE_ENV: "production",
            },
            env_dev: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
