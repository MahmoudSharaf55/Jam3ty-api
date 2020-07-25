const express = require('express');
const Admin = require("../models/admin");
const adminAuth = require('../middleware/admin_auth');
const multer = require('multer');
const sharp = require('sharp');
const mongooseErrorHandling = require('mongoose-error-handler');
const cloudinary = require('cloudinary');
const streamifier = require('streamifier');

cloudinary.config({
    cloud_name: 'jam3ty',
    api_key: '386886893456598',
    api_secret: 'ISNqBzFf7hqi84OCB6mYJ84R7VY'
});

const router = new express.Router();
router.post('/admin/login', async (req, res) => {
    try {
        const admin = await Admin.findByCredentials(req.body.email, req.body.password);
        const lastLogin = admin.updatedAt;
        const token = await admin.generateAuthToken();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                page: 'admin_dashboard.html',
                token: token,
                lastLogin,
                admin: admin
            }
        });
    } catch (e) {
        res.status(500).send({
            status: false,
            code: e.code,
            message: e.message || Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }
});
router.post('/admin/logout', adminAuth, async (req, res) => {
    try {
        req.admin.tokens = req.admin.tokens.filter(token => {
            return token.token !== req.token;
        });
        await req.admin.save();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                admin: req.admin
            }
        });
    } catch (e) {
        res.status(500).send({
            status: false,
            code: null,
            message: [e.message] || Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }
});
router.post('/admin/logoutAll', adminAuth, async (req, res) => {
    try {
        req.admin.tokens = [];
        await req.admin.save();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                admin: req.admin
            }
        });
    } catch (e) {
        res.status(500).send({
            status: false,
            code: null,
            message: e.message || Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }
});
router.get('/admin/me', adminAuth, async (req, res) => {
    return res.send({
        status: true,
        code: null,
        message: '',
        data: {admin: req.admin, token: req.token},
    });
});
router.patch('/admin/me', adminAuth, async (req, res) => {
    const updateKeys = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'phone'];
    const isValid = updateKeys.every(item => allowedUpdates.includes(item));
    if (!isValid) {
        return res.status(406).send({
            status: false,
            code: null,
            message: 'Not allowed to update some Fields',
            data: {}
        });
    }
    try {
        updateKeys.forEach(item => req.admin[item] = req.body[item]);
        await req.admin.save();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                admin: req.admin
            }
        });
    } catch (e) {
        res.status(500).send({
            status: false,
            code: null,
            message: e.message || Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }
});
const upload = multer({
    limits: {
        fileSize: 2500000,   // 2.5 MB
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            const error = new Error('file must be jpg or jpeg or png');
            error.code = 300;
            cb(error);
        }
        cb(undefined, true)
    }
});
router.post('/admin/me/avatar', adminAuth, upload.single('image'), async (req, res) => {
    const width = parseInt(req.query.width);
    const height = parseInt(req.query.height);
    if (req.file === undefined || req.file.fieldname != 'image')
        return res.status(400).send({
            status: false,
            code: null,
            message: 'Invalid Field Name',
            data: {}
        });
    const buffer = req.query.width ? await sharp(req.file.buffer).resize(width, height).toBuffer() : req.file.buffer;
    const stream = cloudinary.v2.uploader.upload_stream(
        {
            public_id: 'avatar',
            folder: req.admin._id.toString()
        },
        async function (error, result) {
            if (error) {
                return res.status(500).send({
                    status: false,
                    code: null,
                    message:
                        'Error while uploading image try again',
                    data: {}
                });
            }
            req.admin.avatar = result["secure_url"];
            await req.admin.save();
            res.send({
                status: true,
                code: null,
                message: 'Stored Successfully',
                data: {
                    url: result["secure_url"]
                }
            });
        });
    streamifier.createReadStream(buffer).pipe(stream);
}, (error, req, res, next) => {
    res.status(500).send({
        status: false,
        code: error.code,
        message: error.message || Object.values(mongooseErrorHandling.set(error).errors)[0],
        data: {}
    });
    next();
});
router.delete('/admin/me/avatar', adminAuth, async (req, res) => {
    req.admin.avatar = undefined;
    await req.admin.save();
    res.send({
        status: true,
        code: null,
        message: 'Deleted Successfully',
        data: {}
    });
});
module.exports = router;