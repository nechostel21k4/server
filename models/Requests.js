// models/Request.js
const mongoose = require("mongoose");

const requestsSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: String,
    status: String, // enum=[submitted, accepted,arrived,rejected]
    submitted: {
      time: Date,
      name:String,
      rollNo:String
    },
    cancelled01:{
      time: Date,
      name:String,
      rollNo:String
    },
    accepted: {
      eid: String,
      name: String,
      time: Date,
    },
    rejected: {
      eid: String,
      name: String,
      time: Date,
    },
    cancelled02:{
      time: Date,
      name:String,
      rollNo:String
    },
    // gatein:{
    //   time: Date,
    //   name:String,
    //   eid:String
    // },
    // gateout:{
    //   time: Date,
    //   name:String,
    //   eid:String
    // },
    arrived: {
      eid: String,
      name: String,
      time: Date,
    },
    name: String,
    rollNo: String,
    hostelId: String,
    phoneNo: String,
    parentPhoneNo: String,
    reason:String,
    isActive:Boolean,

    // permission
    date:Date,
    fromTime:Date,
    toTime:Date,
    // leave
    fromDate:Date,
    toDate:Date,

    delay: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Performance Optimization: Indexes for history and status lookups
requestsSchema.index({ hostelId: 1, status: 1, isActive: 1 });
requestsSchema.index({ rollNo: 1, createdAt: -1 });
requestsSchema.index({ hostelId: 1, createdAt: -1 }); // For today's request count queries
requestsSchema.index({ hostelId: 1, "accepted.time": -1 }); // Compound index for history
requestsSchema.index({ hostelId: 1, "arrived.time": -1 });  // Compound index for history
requestsSchema.index({ date: 1 });

// Method to check and update the delay status
// requestsSchema.methods.checkAndUpdateDelay = function () {
//   if (this.returnDate && this.return_time) {
//     const returnDateTime = new Date(
//       `${this.returnDate.toISOString().split("T")[0]}T${this.return_time}:00`
//     );
//     const endDateTime = new Date(
//       `${this.endDate.toISOString().split("T")[0]}T${this.toTime}:00`
//     );

//     if (returnDateTime > endDateTime) {
//       this.delay = true;
//     } else {
//       this.delay = false;
//     }
//   }
//   return this.delay;
// };

module.exports = mongoose.model("Request", requestsSchema);
