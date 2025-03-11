const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const auth = require("../authenticate");
const { getToken, getRefreshToken } = require("../tokens");
const cors = require("./cors");

router.use(bodyParser.json());

router
    .route("/login")
    .options(cors.corsWithOptions, (req, res) => {
        res.sendStatus(200);
    })
    .post(cors.corsWithOptions, auth.verifyAccountLocal, async (req, res) => {
        const token = await getToken(req);
        const refreshToken = await getRefreshToken(req);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Refresh-JWT", token);
        res.setHeader("refresh-token", refreshToken);
        res.json({
            status: true,
            message: "Login successful!",
            data: {
                username: req.account.username,
                email: req.account.email,
                access_token: token,
                refresh_token: refreshToken,
            },
        });
    });

// Passport exposes a function logout() on the req object which removes the req.user
router
    .route("/logout")
    .options(cors.corsWithOptions, (req, res) => {
        res.sendStatus(200);
    })
    .get(cors.corsWithOptions, (req, res) => {
        req.logout();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json({
            status: true,
            message: "Logged out successful!",
        });
    });
// Default exports
module.exports = router;
