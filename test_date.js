const { formatDateWithTime, formatDate, formatTime } = require("./utils/formatDate");

const date = new Date();
console.log("Current Server Time:", date.toString());
console.log("Formatted IST DateWithTime:", formatDateWithTime(date));
console.log("Formatted IST Date:", formatDate(date));
console.log("Formatted IST Time:", formatTime(date));

// Test with a specific UTC date
// 2023-10-25T10:00:00Z is 3:30 PM IST
const specificDate = new Date("2023-10-25T10:00:00Z");
console.log("\nSpecific UTC Date:", specificDate.toISOString());
console.log("Expected IST Time: 03:30 PM");
console.log("Formatted IST Time:", formatTime(specificDate));
