import {User} from "../../models";
import {find} from "lodash"

const {SECRET} = require("../../config")
const {hash, compare} = require('bcryptjs')
const {serializeUser, issueAuthToken, serializeEmail} = require('../../serializers')
const {
    UserRegisterationRules,
    UserAuthenticationRules,
    EmailRules,
    PasswordRules,
    UserRules
} = require('../../validations');
const {verify} = require('jsonwebtoken');
import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';
import {sendEmail} from "../../utils/sendEmail";
import {emailConfirmationUrl, emailConfirmationBody} from "../../utils/emailConfirmationUrl";
import {forgetPasswordUrl, forgetPasswordBody} from "../../utils/forgetPasswordUrl";
import speakeasy from "speakeasy";
import qrcode from "qrcode";


let fetchData = () => {
    return User.find();
}

const resolvers = {
    User: {
        // shops: async (parent) => {
        //     return await Shop.find({"publisher": parent.id})
        // },
    },
    Query: {
        users: () => {
            return fetchData()
        },
        me: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await User.findById(user.id)
            } catch (err) {
                throw new ApolloError(err)
            }
        },
        userById: async (_, args) => {
            return await User.findById(args.id);
        },
        loginUser: async (_, {userName, password}, {User}) => {
            // Validate Incoming User Credentials
            await PasswordRules.validate({password}, {abortEarly: false});
            // Find the user from the database
            let user = await User.findOne(
            { $or: [ {"userName":userName}, { "email":userName} ] }
            );
            // If User is not found
            if (!user) {
                throw new ApolloError("User Not Found", '404');
            } else if (!user.confirmed) {
                /// Sending Email to user
                let emailData = {
                    id: user.id,
                    email: user.email
                }
                let userEmail = await serializeEmail(emailData);
                let emailLink = await emailConfirmationUrl(userEmail);
                let emailHtml = await emailConfirmationBody(user.fullName, emailLink);
                await sendEmail(user.email, emailLink, emailHtml)
                throw new ApolloError("Email Not Confirmed", '403');
            } else {

            }
            // If user is found then compare the password
            let isMatch = await compare(password, user.password);
            // If Password don't match
            if (!isMatch) {
                throw new ApolloError("Username or Password Is Invalid", '403');
            }

            user = await serializeUser(user);
            // Issue Token
            let token = await issueAuthToken(user);
            return {
                user,
                token,
            }
        },
        verify2FA: async (_, {token}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await speakeasy.totp.verify({
                    secret: user.twoFactorSecret,
                    encoding: 'base32',
                    token: token
                })
            } catch (err) {
                throw new ApolloError("Verification Failed")
            }
        },
        searchPendingKyc: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                return await User.find({"kyc.kycStatus": "PENDING"});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchUnBlockedUsers: async (_, {}, {user, User}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                return await User.find({"isBlocked": false, "confirmed": true});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        authUser: async (_, __, {
            req: {
                user
            }
        }) => user,


    },
    Mutation: {
        blockUser: async (_, {id}, {user, User}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === 'ADMIN') {
                    let blockingUser = await User.findById(id);
                    if (blockingUser.type !== 'ADMIN') {
                        let response = await User.findByIdAndUpdate(id, {isBlocked: true});
                        if (!response) {
                            return new ApolloError("User Not Found", '404')
                        }
                        return true;
                    }
                    return new ApolloError("Admin Cannot be Blocked", 403)
                }
            } catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        verifyKyc: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            if (user.type === "ADMIN") {
                try {
                    let response = await User.findByIdAndUpdate(id, {$set: {"kyc.kycStatus": "VERIFIED"}});
                    if (!response) {
                        return new ApolloError("User not found", '404');
                    }
                    return true
                } catch (err) {
                    throw new ApolloError("Internal Server Error", '500')
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        cancelKyc: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            if (user.type === "ADMIN") {
                try {
                    let response = await User.findByIdAndUpdate(id, {$set: {"kyc.kycStatus": "NOT_VERIFIED"}});
                    if (!response) {
                        return new ApolloError("User Not Found", '404')
                    }
                    return true
                } catch (err) {
                    throw new ApolloError("Internal Server Error", '500');
                }
            } else {
                throw new AuthenticationError("Unauthorised", '401');
            }
        },
        disable2FA: async (_, __, {User, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            try {
                let response = await User.findByIdAndUpdate(user.id, {
                    $set: {
                        twoFactorEnabled: false,
                        twoFactorSecret: "",
                        twoFactorCode: ""
                    }
                }, {new: true});
                if (!response) {
                    return new ApolloError("User Not Found", '404')
                }
                return true;
            } catch (err) {
                throw new ApolloError("Internal Server Error", '500')
            }
        },
        enable2FA: async (_, __, {User, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            try {
                let secret = speakeasy.generateSecret({
                    name: "DappsLab"
                })

                const data = await qrcode.toDataURL(secret.otpauth_url);

                let response = await User.findByIdAndUpdate(user.id, {
                    $set: {
                        twoFactorEnabled: true,
                        twoFactorSecret: secret.base32,
                        twoFactorCode: data
                    }
                }, {new: true});
                if (!response) {
                    return new ApolloError("User Not Found", '404')
                }
                return response;
            } catch (err) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        forgetPassword: async (_, {email}) => {
            await EmailRules.validate({email}, {abortEarly: false});

            const user = await User.findOne({email: email});
            if (!user) {
                throw new ApolloError("Email not registered", '404');
            } else {
                let emailData = {
                    id: user.id,
                    email: user.email
                }
                let userEmail = await serializeEmail(emailData);
                let emailLink = await forgetPasswordUrl(userEmail);
                let emailHtml = await forgetPasswordBody(user.userName ,emailLink);
                return await sendEmail(email, emailLink, emailHtml);
            }

        },
        resetPassword: async (_, {token, password}) => {

            if (!token || token === "" || token == "") {
                throw new UserInputError("Token Not Found", '401');
            }

            // Verify the extracted token
            let decodedToken;
            try {
                decodedToken = verify(token, SECRET);
            } catch (err) {
                throw new AuthenticationError("Token Not Found", '401');
            }

            // If decoded token is null then set authentication of the request false
            if (!decodedToken) {
                throw new AuthenticationError("Token Not Found", '401');
            }

            // If the user has valid token then Find the user by decoded token's id
            let authUser = await User.findById(decodedToken.id);
            let user;
            if (!authUser) {
                throw new AuthenticationError("Invalid Token", '401');
            } else {

                await PasswordRules.validate({password}, {abortEarly: false});
                const passwordHash = await hash(password, 10);
                if (authUser.resetPasswordToken === token) {
                    try {
                        user = await User.findByIdAndUpdate(authUser.id, {
                            $set: {
                                password: passwordHash,
                                resetPasswordToken: ""
                            }
                        }, {new: true});
                        if (!user) {
                            return new ApolloError("User Not Found", '404')
                        }
                        return true
                    } catch (err) {
                        return new ApolloError("Internal Server Error", '500')
                    }
                }
            }
            return false
        },
        confirmEmail: async (_, {token}) => {

            if (!token || token === "" || token == "") {
                throw new UserInputError("Token Not Found", '401');
            }

            // Verify the extracted token
            let decodedToken;
            try {
                decodedToken = verify(token, SECRET);
            } catch (err) {
                throw new AuthenticationError("Token Not Found", '401');
            }

            // If decoded token is null then set authentication of the request false
            if (!decodedToken) {
                throw new AuthenticationError("Token Not Found", '401');
            }

            // If the user has valid token then Find the user by decoded token's id
            let authUser = await User.findById(decodedToken.id);
            let user;
            if (!authUser) {
                throw new AuthenticationError("Invalid Token", '401');
            } else {
                if (authUser.emailConfirmToken === token) {
                    try {
                        user = await User.findByIdAndUpdate(authUser.id, {
                            $set: {
                                confirmed: true,
                                emailConfirmToken: ""
                            }
                        }, {new: true});
                        if (!user) {
                            return new ApolloError("User Not Found", '404')
                        }
                        return true
                    } catch (err) {
                        throw new ApolloError("Internal Server Error", '500')
                    }
                }
            }
            return false
        },
        editUser: async (_, {newUser}, {User, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await User.findOneAndUpdate({_id: user.id}, newUser, {new: true});
            } catch (err) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        deleteUser: async (_, args) => {
            try {
                return await User.findByIdAndRemove(args.id);
            } catch (e) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        addKyc: async (_, args, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                const kyc = args;
                return await User.findOneAndUpdate({_id: args.id}, {$set: {kyc}}, {new: true});
            } catch (e) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        editKyc: async (_, args, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                const kyc = args;
                let response = await User.findById(args.id);
                let oldKyc = response.kyc;
                let newKyc = {...oldKyc, ...kyc};
                delete newKyc.id;
                delete newKyc["$init"];
                return await User.findByIdAndUpdate(
                    {_id: args.id},
                    {$set: {kyc: newKyc}},
                    {new: true}
                );
            } catch (e) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        createAdmin: async (_, {email}, {User, user}) => {
            await EmailRules.validate({email}, {abortEarly: false});

            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let newUser = await User.findOneAndUpdate({email: email}, {$set: {type: "ADMIN"}});
                if (!newUser) {
                    return new ApolloError("User Not Found. User Must Be Registered")
                }
                return true;
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        changePassword: async (_, {password, newPassword}, {user, User}) => {
            await PasswordRules.validate({password}, {abortEarly: false})
            let backup = password;
            password = newPassword;
            await PasswordRules.validate({password}, {abortEarly: false});
            password = backup;
            try {
                if (!user) {
                    return new AuthenticationError("Authentication Must Be Provided")
                }
                console.log("hi2")
                if (await compare(password, user.password)) {
                    console.log("hi3")
                    try {
                        const passwordHash = await hash(newPassword, 10);
                        user = await User.findByIdAndUpdate(user.id, {
                            $set: {
                                password: passwordHash
                            }
                        }, {new: true});
                        if (!user) {
                            return new ApolloError("User Not Found", '404')
                        }
                        return true
                    } catch (err) {
                        return new ApolloError("Internal Server Error", '500')
                    }
                } else {
                    return new ApolloError("Invalid Password", 403)
                }

            } catch (e) {
                throw new ApolloError("Internal Server Error", '500')
            }
        },
        registerUser: async (_, {newUser}, {User}) => {
            let {
                email,
                userName,
            } = newUser;

            await UserRegisterationRules.validate(newUser, {abortEarly: false});

            try {

                // Validate Incoming New User Arguments
                // Check if the Username is taken
                let user = await User.findOne({
                    userName
                });
                if (user) {
                    return new ApolloError('Username Is Already Taken.', '403')
                }

                // Check is the Email address is already registered
                user = await User.findOne({
                    email
                });
                if (user) {
                    return new ApolloError('Email is already registered.', '403')
                }

                user = new User(newUser);
                // Hash the user password
                user.password = await hash(user.password, 10);

                // Save the user to the database
                let result = await user.save();
                let emailstr = {
                    id: user.id,
                    email: user.email
                }
                let userEmail = await serializeEmail(emailstr);
                let emailLink = await emailConfirmationUrl(userEmail);
                let emailHtml = await emailConfirmationBody(result.fullName, emailLink);
                await sendEmail(result.email, emailLink, emailHtml);


                result = await serializeUser(result);

                // Issue Token
                let token = await issueAuthToken(result);
                return {
                    token,
                    user: result
                }
            } catch (err) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
    },
}

module.exports = resolvers;
