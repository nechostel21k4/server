const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const logSchema = new Schema({
  date: { type: Date, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  action: { type: String, required: true },
});

logSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Log", logSchema);
