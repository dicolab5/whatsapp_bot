// src/config/multerConfig.js
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadPath = path.join(process.cwd(), "public", "uploads", "receipts");
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato inválido. Envie PDF, PNG ou JPG"));
}

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });


// // src/config/multerConfig.js
// const multer = require("multer");
// const path = require("path");
// const crypto = require("crypto");
// const fs = require("fs");

// // Pasta onde os comprovantes serão salvos
// const uploadPath = path.join(__dirname, "../../uploads");

// // garante que existe
// fs.mkdirSync(uploadPath, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadPath),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const hash = crypto.randomBytes(8).toString("hex");
//     cb(null, `${Date.now()}-${hash}${ext}`);
//   },
// });

// function fileFilter(req, file, cb) {
//   const allowed = ["application/pdf", "image/png", "image/jpeg"];
//   if (allowed.includes(file.mimetype)) cb(null, true);
//   else cb(new Error("Formato inválido. Envie PDF, PNG ou JPG"));
// }

// module.exports = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 },
// });


// // // src/config/multerConfig.js
// // const multer = require("multer");
// // const path = require("path");
// // const crypto = require("crypto");

// // // Pasta onde os comprovantes serão salvos
// // const uploadPath = path.join(__dirname, "../../uploads");

// // const storage = multer.diskStorage({
// //     destination: (req, file, cb) => {
// //         cb(null, uploadPath);
// //     },
// //     filename: (req, file, cb) => {
// //         const ext = path.extname(file.originalname);
// //         const hash = crypto.randomBytes(8).toString("hex");
// //         cb(null, `${Date.now()}-${hash}${ext}`);
// //     }
// // });

// // function fileFilter(req, file, cb) {
// //     const allowed = ["application/pdf", "image/png", "image/jpeg"];

// //     if (allowed.includes(file.mimetype)) cb(null, true);
// //     else cb(new Error("Formato inválido. Envie PDF, PNG ou JPG"));
// // }

// // module.exports = multer({
// //     storage,
// //     fileFilter,
// //     limits: { fileSize: 5 * 1024 * 1024 } // 5MB
// // });
