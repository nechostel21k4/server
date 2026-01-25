const Log = require("../models/logs ");

// Add a new log
exports.addLog = async (req, res) => {
  try {
    const { date, userId, username, action } = req.body;

    const newLog = new Log({
      date,
      userId,
      username,
      action,
    });

    await newLog.save();
    res.status(201).json({success:true, message: "Log added successfully" });
  } catch (error) {
    res.status(500).json({success:false, message: "Error adding log", error });
  }
};

// Get logs based on the selected date
exports.getLogsByDate = async (req, res) => {
  try {
    const { date } = req.body;

    const logs = await Log.find({
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) // Full day range
      }
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving logs', error });
  }
};

// Drlrtr logs older that 6 months
exports.deleteOldLogs = async (req, res) => {
  try {
    // Calculate the date 6 months ago from today
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Delete logs older than 6 months
    const deleteResult = await Log.deleteMany({ date: { $lt: sixMonthsAgo } });

    // Check if any logs were deleted
    

    res.status(200).json({
      isDeleted: true,
      message: `${deleteResult.deletedCount} logs deleted.`,
    });
  } catch (error) {
    // console.error("Error deleting old logs:", error);
    res.status(500).json({
      isDeleted: false,
      message: "Server error. Please try again later.",
    });
  }
};
