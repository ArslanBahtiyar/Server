const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// role'e göre dinamik klasör: "sende-katil/users" veya "sende-katil/communities" veya "event"
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Özel bir header kontrolü ile etkinlik fotoğrafı olup olmadığını anlıyoruz
    const isEventPhoto = req.headers["x-upload-type"] === "event";

    let folder = "sende-katil/others";
    let public_id = `${req.user.id}_${Date.now()}`;

    if (isEventPhoto) {
      folder = "sende-katil/events";
      public_id = `event_${req.user.id}_${Date.now()}`;
    } else {
      if (req.user.role === "community") {
        folder = "sende-katil/communities";
      } else if (req.user.role === "user") {
        folder = "sende-katil/users";
      }
    }

    return {
      folder,
      resource_type: "image",
      transformation: [{ width: 800, height: 600, crop: "fill" }], // Etkinlikler genelde dikdörtgen daha iyidir
      public_id,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Sadece .jpg, .jpeg, .png ve .webp formatlı resimler yüklenebilir."), false);
  }
};

module.exports = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB Limit
});
