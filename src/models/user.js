const validator = require('validator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const eduEmail = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-]+)\.?([a-zA-Z0-9_\-])+?\.edu\.([a-zA-Z]{2,3})$/;
const userSchema = new mongoose.Schema({
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
            if (!validator.isEmail(value) || !eduEmail.test(value)) {
                throw new Error('Invalid Educational Email');
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
                throw new Error('Password must be more than 6 letter')
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
    avatar: {
        type: String,
        default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
    },
    verified:{
        type: Boolean,
        default: false,
    },
    token: String,
    code: String,
}, {
    timestamps: true,
});
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.token;
    delete user.code;
    return user;
};
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET_USER);
    user.token = token;
    await user.save();
    return token;
};
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email});
    if (!user) {
        const error = Error('Unable to login, incorrect emails');
        error.code = 101;
        throw error;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = Error('Unable to login, incorrect password');
        error.code = 102;
        throw error;
    }
    return user;
};
userSchema.statics.generateVerificationCode = (length) => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});
const User = mongoose.model('User', userSchema);
module.exports = User;