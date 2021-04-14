const {SECRET} =require('../config');
const {User} = require('../models');
const {verify} = require('jsonwebtoken');


/**
 * Custom User Authentication Middleware
 * Which Finds the user from the database using the request token
 */
const AuthMiddleware = async (req, res, next) => {
    // Extract Authorization Header
    console.log("headers:",req.get("Authorization"))
    const authHeader = req.get("Authorization");
    if (!authHeader) {
        req.isAuth = false;
        return next();
    }

    // Extract the token and check for token
    const token = authHeader.split(" ")[1];
    if (!token || token === "") {
        req.isAuth = false;
        return next();
    }

    // Verify the extracted token
    let decodedToken;
    try {
        decodedToken = verify(token, SECRET);
    } catch (err) {
        req.isAuth = false;
        return next();
    }

    // If decoded token is null then set authentication of the request false
    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }

    // If the user has valid token then Find the user by decoded token's id
    let authUser = await User.findById(decodedToken.id);
    if (!authUser) {
        req.isAuth = false;
        return next();
    }

    req.isAuth = true;
    req.user = authUser;
    return next();
}

export default AuthMiddleware;