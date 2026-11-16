import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["online", "idle", "offline"], // to restrict a field
      default: "offline",
    },
    googleId: {
      type: String,
      sparse: true, // allows multiple null values
      unique: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // make password optional for Google users
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
      // removed required:true
    },
    // One user can store references to multiple Workspace documents
    workspaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
      },
    ],
  },
  { timestamps: true }, // createdAt and  updatedAt
);

// Hash password before saving
// Hash password before saving
userSchema.pre("save", async function () {

  // skip if password not modified
  if (!this.isModified("password")) {
    return;
  }

  // skip google users
  if (!this.password) {
    return;
  }

  // hash password
  this.password = await bcrypt.hash(this.password, 10);
});
//prev("save") only run for .save() and .create()
// not for findByIdAndUpdate() updateOne() findOneAndUpdate()

// Compare password on login
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;

  return bcrypt.compare(enteredPassword, this.password);
};
const User = mongoose.model("User", userSchema);
export default User;
