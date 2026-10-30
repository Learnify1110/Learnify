const express = require("express");
const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const allowedCourses = [
  "Web Development",
  "Python Programming",
  "Data Science Basics"
];

// Enroll a student in a course
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { courseName } = req.body;

    if (!allowedCourses.includes(courseName)) {
      return res.status(400).json({
        message: "Invalid course selected."
      });
    }

    const studentId = new mongoose.Types.ObjectId(req.userId);

    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      courseName
    });

    if (existingEnrollment) {
      return res.status(409).json({
        message: "You are already enrolled in this course."
      });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      courseName
    });

    return res.status(201).json({
      message: "Course enrollment successful!",
      enrollment: {
        id: enrollment._id,
        courseName: enrollment.courseName,
        enrolledAt: enrollment.enrolledAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You are already enrolled in this course."
      });
    }

    console.error("Enrollment error:", error.message);

    return res.status(500).json({
      message: "Could not enroll in the course."
    });
  }
});

// Get courses enrolled by the logged-in student
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.userId
    }).sort({ enrolledAt: -1 });

    return res.json({
      enrollments
    });
  } catch (error) {
    console.error("Fetch enrollments error:", error.message);

    return res.status(500).json({
      message: "Could not fetch your enrollments."
    });
  }
});

module.exports = router;
