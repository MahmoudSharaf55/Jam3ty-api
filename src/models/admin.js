const validator = require('validator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid Email');
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: 6,
        validate(value) {
            if (value.length < 6) {
                throw new Error('Password must be more than 6 letter');
            }
        }
    },
    phone: {
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isNumeric(value)) {
                throw new Error('Invalid number phone');
            }
        },
    },
    tokens: [{
        token: {
            type: String,
            required: true,
        },
        _id: false,
    }],
    avatar: {
        type: String,
    }
}, {
    timestamps: true,
});
adminSchema.methods.toJSON = function () {
    const admin = this.toObject();
    delete admin.password;
    delete admin.tokens;
    return admin;
};
adminSchema.methods.generateAuthToken = async function () {
    const admin = this;
    const token = jwt.sign({_id: admin._id.toString()}, process.env.JWT_SECRET_ADMIN);
    admin.tokens = admin.tokens.concat({token});
    await admin.save();
    return token;
};
adminSchema.statics.findByCredentials = async (email, password) => {
    if (email.toString() === 'admin@shawarshop.com' && password.toString() === '123456') {
        const admins = await Admin.find({});
        if (admins.length === 0) {
            const rec_admin = new Admin({
                name: "Temporary Admin",
                email: "admin@shawarshop.com",
                password: '123456'
            });
            await rec_admin.save();
        }
    }
    const admin = await Admin.findOne({email});
    if (!admin) {
        const error = new Error('Unable to login, incorrect emails');
        error.code = 101;
        throw error;
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        const error = new Error('Unable to login, incorrect password');
        error.code = 102;
        throw error;
    }
    return admin;
};
adminSchema.pre('save', async function (next) {
    const admin = this;
    if (admin.isModified('password')) {
        admin.password = await bcrypt.hash(admin.password, 8);
    }
    next();
});
const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;