const mongoose = require('mongoose');
const validator = require('validator');

const hostlerCredentialsSchema = new mongoose.Schema({
    rollNo: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: true,
        // Uncomment if you want strong password validation
        // validate: {
        //     validator: function (value) {
        //         return validator.isStrongPassword(value, {
        //             minLength: 8,
        //             minLowercase: 1,
        //             minUppercase: 1,
        //             minNumbers: 1,
        //             minSymbols: 1
        //         });
        //     },
        //     message: props => `${props.value} is not a strong password`
        // }
    },
    otp: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('HostlerCredentials', hostlerCredentialsSchema);
