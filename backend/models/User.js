const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      sparse: true,
    },
    resetOtpHash: {
  type: String,
  default: null,
},
resetOtpExpires: {
  type: Date,
  default: null,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
