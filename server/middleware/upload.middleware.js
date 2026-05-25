import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// ─── Allowed file types ───────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES  = ["application/pdf"];
const ALL_ALLOWED         = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_FILE_TYPES];

// ─── Cloudinary storage engine ────────────────────────────────────────────────
// Files go directly from multer → Cloudinary (no local disk storage)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);

    return {
      folder: `syncspace/${isImage ? "images" : "files"}`,
      // keep original filename (sanitised) + timestamp to avoid collisions
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
      // images → compressed webp for performance; PDFs → raw
      format: isImage ? "webp" : undefined,
      resource_type: isImage ? "image" : "raw",
      // max image dimensions (Cloudinary resizes on upload)
      transformation: isImage
        ? [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }]
        : undefined,
    };
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Only JPEG, PNG, GIF, WEBP and PDF are allowed."
      ),
      false
    );
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

// ─── Middleware exports ───────────────────────────────────────────────────────
// single file upload — use field name "file" in the form
export const uploadSingle = upload.single("file");

// avatar upload — images only
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "syncspace/avatars",
    format: "webp",
    transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for avatars"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for avatars
}).single("avatar");

// workspace icon upload
const iconStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "syncspace/icons",
    format: "webp",
    transformation: [{ width: 128, height: 128, crop: "fill" }],
  },
});

export const uploadIcon = multer({
  storage: iconStorage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for workspace icons"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB for icons
}).single("icon");

// ─── Multer error handler ─────────────────────────────────────────────────────
// Use this after any upload middleware in routes to catch multer errors cleanly
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  next();
};