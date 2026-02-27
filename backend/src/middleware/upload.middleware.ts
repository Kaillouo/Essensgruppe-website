import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const makeStorage = (folder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(__dirname, '..', '..', 'uploads', folder));
    },
    filename: (_req, _file, cb) => {
      const unique = `${Date.now()}-${crypto.randomUUID()}`;
      cb(null, `${unique}.jpg`);
    },
  });

const imageFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, webp, gif)'));
  }
};

export const uploadEventPhoto = multer({
  storage: makeStorage('events'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('photo');

export const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('avatar');
