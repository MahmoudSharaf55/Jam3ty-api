const express = require('express');
const User = require("../models/user.js");
const userAuth = require('../middleware/user_auth');
const multer = require('multer');
const sharp = require('sharp');
const mongooseErrorHandling = require('mongoose-error-handler');
const cloudinary = require('cloudinary');
const streamifier = require('streamifier');
const sendVerificationEmail = require('../emails/account');

cloudinary.config({
    cloud_name: 'jam3ty',
    api_key: '386886893456598',
    api_secret: 'ED-ISNqBzFf7hqi84OCB6mYJ84R7VY'
});

const router = new express.Router();
router.post('/user', async (req, res) => {
    try {
        const user = new User(req.body);
        user.code = User.generateVerificationCode(6);
        await user.save();
        sendVerificationEmail(user.name, user.email, user.code);
        res.status(201).send({
            status: true,
            code: 103,
            message: 'Verification code is sent',
            data: {
                id: user._id,
            }
        });
    } catch (e) {
        res.status(500).send({
            status: false,
            code: e.code === 11000 ? 100 : null,
            message: e.code === 11000 ? "Duplicated emails" : Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }
});
router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        if (user.verified === false) {
            user.code = User.generateVerificationCode(6);
            await user.save();
            sendVerificationEmail(user.name, user.email, user.code);
            return res.send({
                status: true,
                code: 103,
                message: 'Verification code is sent',
                data: {
                    id: user._id,
                }
            });
        }
        const token = await user.generateAuthToken();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                token: token,
                user: user
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
router.post('/user/logout', userAuth, async (req, res) => {
    try {
        req.user.token = undefined;
        await req.user.save();
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                user: req.user
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
router.get('/user/me', userAuth, async (req, res) => {
    return res.send({
        status: true,
        code: null,
        message: '',
        data: {user: req.user, token: req.token},
    });
});
router.patch('/user/me', userAuth, async (req, res) => {
    const updateKeys = Object.keys(req.body);
    const allowedUpdates = ['name', 'phone', 'password'];
    const isValid = updateKeys.every(item => allowedUpdates.includes(item));
    if (!isValid) {
        return res.status(500).send({
            status: false,
            code: null,
            message:
                'Not allowed to update some Fields',
            data: {}
        });
    }
    try {
        updateKeys.forEach(item => req.user[item] = req.body[item]);
        await req.user.save();
        res.send({
            status: true,
            code: null,
            message: 'Information Updated',
            data: {
                user: req.user,
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
            cb(new Error('file must be jpg or jpeg or png'))
        }
        cb(undefined, true)
    }
});
router.post('/user/me/avatar', userAuth, upload.single('image'), async (req, res) => {
    try {
        const width = parseInt(req.query.width);
        const height = parseInt(req.query.height);
        if (req.file == undefined || req.file.fieldname != 'image')
            return res.status(400).send({
                status: false,
                code: null,
                message:
                    'Invalid Field Name',
                data: {}
            });
        const buffer = req.query.width ? await sharp(req.file.buffer).resize(width, height).toBuffer() : req.file.buffer;
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                public_id: 'avatar',
                folder: req.user._id.toString()
            },
            async function (error, result) {
                console.log(error);
                if (error) {
                    return res.status(500).send({
                        status: false,
                        code: null,
                        message:
                            'Error while uploading image try again',
                        data: {}
                    });
                }
                req.user.avatar = result["secure_url"];
                await req.user.save();
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
    } catch (e) {
        res.status(500).send({
            status: false,
            code: null,
            message: e.message || Object.values(mongooseErrorHandling.set(e).errors)[0],
            data: {}
        });
    }

}, (error, req, res, next) => {
    res.status(500).send({
        status: false,
        code: null,
        message: error.message || Object.values(mongooseErrorHandling.set(error).errors)[0],
        data: {}
    });
    next();
});
router.delete('/user/me/avatar', userAuth, async (req, res) => {
    req.user.avatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    await req.user.save();
    res.send({
        status: true,
        code: null,
        message: 'Deleted Successfully',
        data: {}
    });
});
router.get('/user/me/avatar', userAuth, async (req, res) => {
    try {
        if (!req.user.avatar) {
            return res.status(404).send({
                status: false,
                code: null,
                message: 'No Avatar',
                data: {}
            });
        }
        res.send({
            status: true,
            code: null,
            message: '',
            data: {
                url: req.user.avatar,
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
router.post('/user/verifyCode', async (req, res) => {
    try {
        const id = req.body.userId;
        const code = req.body.code;
        const user = await User.findById(id);
        if (user.code != code) {
            return res.status(406).send({
                status: false,
                code: null,
                message: 'Invalid code',
                data: {}
            });
        }
        user.verified = true;
        user.code = '';
        const token = await user.generateAuthToken();
        res.send({
            status: true,
            code: null,
            message: 'Verified',
            data: {
                user,
                token
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
router.post('/user/forgetPassword', async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.find({email});
        if (user.length !== 1) {
            throw new Error('no user with this email');
        }
        user[0].verified = false;
        user[0].code = User.generateVerificationCode(6);
        sendVerificationEmail(user[0].name, user[0].email, user[0].code);
        await user[0].save();
        res.send({
            status: true,
            code: null,
            message: 'Verification code is sent',
            data: {
                id: user._id
            },
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
module.exports = router;
// res.set('Cache-Control', 'public, max-age=180, s-maxage=360');