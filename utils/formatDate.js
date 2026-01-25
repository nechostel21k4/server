
const getISTDate = (date) => {
  // Convert the date to a string in IST, then create a new Date object from it.
  // This creates a Date object where getHours(), etc., return the IST values.
  const istString = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
};

exports.formatDateWithTime = (date) => {
  const istDate = getISTDate(date);
  // Day, month, year
  const day = String(istDate.getDate()).padStart(2, "0");
  const month = String(istDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = istDate.getFullYear();

  // Hours, minutes, AM/PM
  let hours = istDate.getHours();
  const minutes = String(istDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'

  // Replace the string in the desired format
  return ` ${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
};

exports.formatDate = (date) => {
  const istDate = getISTDate(date);
  // Day, month, year
  const day = String(istDate.getDate()).padStart(2, "0");
  const month = String(istDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = istDate.getFullYear();
  // console.log(`${day}-${month}-${year}`);
  return `${day}-${month}-${year}`;
};

exports.formatTime = (date) => {
  const istDate = getISTDate(date);
  // Hours, minutes, AM/PM
  let hours = istDate.getHours();
  const minutes = String(istDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'
  // console.log(`${hours}:${minutes} ${ampm}`);

  return `${hours}:${minutes} ${ampm}`;
};
