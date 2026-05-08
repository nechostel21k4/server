const NodeCache = require("node-cache");

// stdTTL: standard time to live in seconds. 300 = 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

module.exports = cache;
