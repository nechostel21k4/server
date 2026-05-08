// models/Admin.js
const mongoose = require("mongoose");

const facutlySchema = new mongoose.Schema(
  {
    username:{type:String,require:true},
    password:{type:String,require:true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faculty", facutlySchema);
