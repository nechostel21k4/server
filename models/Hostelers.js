// models/Hostel.js
const mongoose = require('mongoose');

const hostelersSchema = new mongoose.Schema({
   hostelId: String,
   rollNo: { type: String, required: true, unique: true },
   name: String,
   college:String,
   year:Number,
   branch:String,
   gender:String,
   // dob:{ type: Date},
   phoneNo: { type: String, required: true },
   email: String,
   parentName: String,
   roomNo:String,
   parentPhoneNo: { type: String, required: true },
   currentStatus:{type:String,default:"HOSTEL"} , // enum:[“hostel”,”permission”,”leave”],
   requestCount:{type:Number,default:0},
   lastRequest:{}
    
}, { timestamps: true });


module.exports = mongoose.model('Hosteler', hostelersSchema);
