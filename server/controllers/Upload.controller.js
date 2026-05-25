import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";

// ─── Helper: determine file type from mimetype ────────────────────────────────
const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  return "other";
};

// ─── @route  POST /api/upload/file ───────────────────────────────────────────
// ─── @access Private — member or above
// ─── @desc   Upload a file or image for use in chat messages
//             multer uploads to Cloudinary before this runs
//             req.file is populated by uploadSingle middleware
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const fileType = getFileType(req.file.mimetype);

    res.status(200).json({
      success: true,
      url:      req.file.path,       // Cloudinary URL
      publicId: req.file.filename,   // Cloudinary public_id (for deletion)
      fileType,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("uploadFile error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  POST /api/upload/avatar ─────────────────────────────────────────
// ─── @access Private
// ─── @desc   Upload and update the logged-in user's avatar
export const uploadUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });
    }

    const user = await User.findById(req.user.id);

    // delete old avatar from Cloudinary if it exists
    if (user.avatar) {
      const oldPublicId = extractPublicId(user.avatar);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
      }
    }

    // update user avatar in DB
    user.avatar = req.file.path;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      avatar: req.file.path,
      user,
    });
  } catch (error) {
    console.error("uploadUserAvatar error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  POST /api/upload/workspace-icon/:workspaceId ────────────────────
// ─── @access Private — admin or above
// ─── @desc   Upload and update a workspace icon
export const uploadWorkspaceIcon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });
    }

    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // delete old icon from Cloudinary if it exists
    if (workspace.icon) {
      const oldPublicId = extractPublicId(workspace.icon);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
      }
    }

    workspace.icon = req.file.path;
    await workspace.save();

    res.status(200).json({
      success: true,
      icon: req.file.path,
      workspace,
    });
  } catch (error) {
    console.error("uploadWorkspaceIcon error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/upload/file ─────────────────────────────────────────
// ─── @access Private
// ─── @desc   Delete a file from Cloudinary by publicId
//             Called when a message with an attachment is deleted
export const deleteFile = async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "publicId is required",
      });
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
    });

    res.status(200).json({
      success: true,
      message: "File deleted from Cloudinary",
    });
  } catch (error) {
    console.error("deleteFile error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Helper: extract Cloudinary public_id from a URL ─────────────────────────
const extractPublicId = (url) => {
  try {
    // e.g. https://res.cloudinary.com/demo/image/upload/v123/syncspace/avatars/abc.webp
    // extracts → syncspace/avatars/abc
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const withVersion = parts[1]; // v123/syncspace/avatars/abc.webp
    const withoutVersion = withVersion.replace(/^v\d+\//, ""); // syncspace/avatars/abc.webp
    return withoutVersion.replace(/\.[^/.]+$/, ""); // remove extension
  } catch {
    return null;
  }
};
