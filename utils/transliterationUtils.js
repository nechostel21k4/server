const axios = require('axios');

/**
 * Transliterates a name from English to Telugu using Google Input Tools API.
 * @param {string} name - The name in English.
 * @returns {Promise<string>} - The transliterated name in Telugu, or the original name if failed.
 */
const transliterateName = async (name) => {
    if (!name) return name;
    try {
        const response = await axios.get(
            `https://inputtools.google.com/request?text=${encodeURIComponent(name)}&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=transliteration_utils`
        );
        // Response format: ["SUCCESS", [["name", ["transliteration1", "transliteration2", ...]]]]
        if (
            response.data[0] === 'SUCCESS' &&
            response.data[1] &&
            response.data[1][0] &&
            response.data[1][0][1] &&
            response.data[1][0][1].length > 0
        ) {
            return response.data[1][0][1][0];
        }
        return name; // Return original if transliteration fails
    } catch (error) {
        console.error(`Error transliterating ${name}:`, error.message);
        return name; // Return original on error
    }
};

module.exports = { transliterateName };
