const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('authorization').replace('Bearer ', '');
        const decode = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        const admin = await Admin.findOne({_id: decode._id, 'tokens.token': token});
        if (!admin) {
            throw new Error();
        }
        req.token = token;
        req.admin = admin;
        next();
    } catch (e) {
        res.status(401).send({
            status: false,
            code: null,
            message: 'Please authenticate as admin',
            data: {}
        });
    }
};
module.exports = adminAuth;