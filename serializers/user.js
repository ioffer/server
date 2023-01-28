import {AuthenticationError} from "apollo-server";

const {pick} = require('lodash');

const {sign,} = require('jsonwebtoken');

const {SECRET} = require('../config/index.js');


const issueAuthToken = async (jwtPayload) => {
    let token = await sign(jwtPayload, SECRET, {
        expiresIn: 3600 * 24
    });
    return `Bearer ${token}`;
};

const issue2FAAuthToken = async (jwtPayload) => {
    let token = await sign(jwtPayload, SECRET, {
        expiresIn: 1800
    });
    return `Bearer ${token}`;
};

const issueConfirmEmailToken = async (jwtPayload) => {
    let token = await sign(jwtPayload, SECRET, {
        expiresIn: 3600 * 24
    });

    return token;
};
const issueShopInviteToken = async (jwtPayload) => {
    console.log("jwtPayload:", jwtPayload)
    let token = await sign({jwtPayload}, SECRET, {
        expiresIn: 3600 * 24
    });
    console.log("jwtPayload TOKEN:", token)
    return token;
};

const serializeUser = user => pick(user, [
    'id',
    'email',
    'userName',
    'fullName',
    'avatar',
    'type',
    'kyc',
    'twoFactorEnabled',
]);

const serializeEmail = user => pick(user, [
    'id',
    'email',
]);


module.exports = {issueAuthToken, serializeUser, issueConfirmEmailToken, serializeEmail, issueShopInviteToken, issue2FAAuthToken};
