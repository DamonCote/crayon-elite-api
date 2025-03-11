const configs = require("../../configs")();

const getUiServerUrl = (req) => {
    let uiServerUrl = null;
    const uiServers = configs.get("uiServerUrl", "list");
    let refererHeader = req.get("Referer");
    if (refererHeader) {
        refererHeader = refererHeader.slice(0, -1); // no need the slash at end
        const found = uiServers.find((s) => s === refererHeader);
        if (found) {
            uiServerUrl = refererHeader;
        } else {
            uiServerUrl = uiServers[0];
        }
    } else {
        uiServerUrl = uiServers[0];
    }
    return uiServerUrl;
};

module.exports = {
    getUiServerUrl,
};
