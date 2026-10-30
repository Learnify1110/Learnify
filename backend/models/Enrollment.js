const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    courseName: {
      type: String,
      required: true,
      trim: true
    },

    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent the same student from enrolling
// in the same course more than once.
enrollmentSchema.index(
  { student: 1, courseName: 1 },
  { unique: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
