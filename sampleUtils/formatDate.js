// utils/formatDate.js
const formatDate = (date) => {
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

module.exports = formatDate;
