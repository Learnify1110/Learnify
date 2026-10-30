const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});
// Student Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    // Basic email and password validation
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Registration successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});
// Google Login / Registration
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required."
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Google authentication is not configured."
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Please use a verified Google account."
      });
    }

    const email = payload.email.toLowerCase();

    let user = await User.findOne({ googleId: payload.sub });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        if (user.googleId && user.googleId !== payload.sub) {
          return res.status(409).json({
            message: "This email is linked to another Google account."
          });
        }

        user.googleId = payload.sub;
        await user.save();
      } else {
        user = await User.create({
          name: payload.name || email.split("@")[0],
          email,
          authProvider: "google",
          googleId: payload.sub
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Google login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Google login error:", error.message);

    return res.status(401).json({
      message: "Google authentication failed. Please try again."
    });
  }
});

// LOGIN API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password."
      });
    }

    const User = require("../models/User");
    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Server error during login."
    });
  }
});
// UPDATE STUDENT PROFILE
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Please enter your name."
      });
    }

    if (name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).json({
        message: "Name must be between 2 and 60 characters."
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name: name.trim() } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Profile update error:", error.message);

    return res.status(500).json({
      message: "Could not update profile. Please try again."
    });
  }
});
// FORGOT PASSWORD: SEND OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Please enter your registered email."
      });
    }

    const user = await User.findOne({ email });

    // Generic response helps avoid revealing which emails are registered.
    if (!user) {
      return res.status(200).json({
        message: "If an eligible account exists, a verification code will be sent."
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.resetOtpHash = otpHash;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Learnify Password Reset Code",
        text: `Your Learnify verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`
      });
    } catch (emailError) {
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      await user.save();

      console.error("OTP email sending failed:", emailError.message);

      return res.status(500).json({
        message: "Could not send the verification email. Please try again."
      });
    }

    return res.status(200).json({
      message: "If an eligible account exists, a verification code will be sent."
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      message: "Could not process your request."
    });
  }
});

// RESET PASSWORD: VERIFY OTP AND SAVE NEW PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = req.body.newPassword;

    if (!email || !/^\d{6}$/.test(otp) ||
        typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        message: "Enter your email, valid 6-digit code, and a password of at least 8 characters."
      });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired verification code. Request a new one."
      });
    }

    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const validOtp =
      submittedHash.length === user.resetOtpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(submittedHash, "hex"),
        Buffer.from(user.resetOtpHash, "hex")
      );

    if (!validOtp) {
      return res.status(400).json({
        message: "Incorrect verification code."
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Password reset successful! Please log in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      message: "Could not reset your password. Please try again."
    });
  }
});
// Verify password reset OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Please enter your email and a valid 6-digit code."
      });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired verification code. Please request a new one."
      });
    }

    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const validOtp =
      submittedHash.length === user.resetOtpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(submittedHash, "hex"),
        Buffer.from(user.resetOtpHash, "hex")
      );

    if (!validOtp) {
      return res.status(400).json({
        message: "Incorrect verification code."
      });
    }

    // OTP is checked here but remains available for the reset-password route.
    return res.status(200).json({
      message: "OTP verified successfully!"
    });

  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      message: "Could not verify the code. Please try again."
    });
  }
});
module.exports = router;
