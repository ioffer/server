import {User, Shop, Brand, Favorite, Pin, RoleBaseAccess, UserSubscription} from "../../models";

const {SECRET} = require("../../config")
const {hash, compare} = require('bcryptjs')
const {serializeUser, issueAuthToken, serializeEmail, issue2FAAuthToken} = require('../../serializers')
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
import {Status, Roles} from "../../constants/enums";


let fetchData = async () => {
    return await User.find({});
}

const resolvers = {
    User: {
        shops: async (parent) => {
            return await Shop.find({"owner": parent.id})
        },
        brands: async (parent,args) => {
            console.log("Args:",args)
            console.log("Brands:", parent.brands)
            let brands = await Brand.find({"owner": parent.id})
            console.log("Brands:", brands)
            return brands
        },
        favorites: async (parent) => {
            return await Favorite.findById(parent.favorites)
        },
        pins: async (parent) => {
            return await Pin.findById(parent.pins)
        },
        subscriptions: async (parent) => {
            return await UserSubscription.findById(parent.subscriptions)
        },
        roleBasedAccess: async (parent) => {
            return await RoleBaseAccess.findById(parent.roleBasedAccess)
        }
    },
    Query: {
        users: () => {
            return fetchData()
        },
        version: () => {
            return "0.0.1";
        },
        me: async (_, {}, {user, isAuth}) => {
            if(!isAuth){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let res = await User.findById(user.id)
                console.log("User", res);
                return res;
            } catch (err) {
                throw new ApolloError(err)
            }
        },
        userById: async (_, args) => {
            return await User.findById(args.id);
        },
        loginUser: async (_, {userName, password}) => {
            console.log('variables:', userName, password)
            // Validate Incoming User Credentials
            await PasswordRules.validate({password}, {abortEarly: false});
            // Find the user from the database
            let user = await User.findOne(
                {$or: [{"userName": userName}, {"email": userName}]}
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
                let response = await sendEmail(user.email, emailLink, emailHtml)
                throw new ApolloError("Email Not Confirmed", '403');
            } else {
                console.log("user found and confirmed")
            }
            // If user is found then compare the password
            let isMatch = await compare(password, user.password);
            // If Password don't match
            if (!isMatch) {
                throw new ApolloError("Username or Password Is Invalid", '403');
            }

            user = await serializeUser(user);
            // Issue Token
            let token = null;
            if (user.twoFactorEnabled) {
                token = issue2FAAuthToken({
                    id: user.id,
                    twoFactorSecret: user.twoFactorSecret,
                    authStatus: 'NO_AUTH'
                })
            } else {
                token = await issueAuthToken({
                    ...user,
                    authStatus: 'AUTH'
                });
            }
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
            if (user.type === Roles.SUPER_ADMIN) {
                return await User.find({"kyc.kycStatus": Status.PENDING});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchUnBlockedUsers: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                return await User.find({"isBlocked": false, "confirmed": true});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        authUser: async (_, __, {req: {user}}) => user,


    },
    Mutation: {
        blockUser: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let blockingUser = await User.findById(id);
                    if (blockingUser.type !== Roles.SUPER_ADMIN) {
                        let response = await User.findByIdAndUpdate(id, {isBlocked: true});
                        if (!response) {
                            return new ApolloError("User Not Found", '404')
                        }
                        return true;
                    }
                    return new ApolloError("Super Admin Cannot be Blocked", 403)
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        updateNotificationToken: async (_, {token}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await User.findByIdAndUpdate(user.id, {notificationToken: token, haveNotificationToken:true});
                return true;
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        verifyKyc: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let response = await User.findByIdAndUpdate(id, {$set: {"kyc.kycStatus": Status.VERIFIED}});
                    if (!response) {
                        return new ApolloError("User not found", '404');
                    }
                    return true
                } catch (err) {
                    return new ApolloError(err, 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        cancelKyc: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let response = await User.findByIdAndUpdate(id, {$set: {"kyc.kycStatus": Status.REJECTED}});
                    if (!response) {
                        return new ApolloError("User Not Found", '404')
                    }
                    return true
                } catch (err) {
                    // throw new ApolloError("Internal Server Error", '500');
                    return new ApolloError(err, 500);
                }
            } else {
                throw new AuthenticationError("Unauthorised", '401');
            }
        },
        disable2FA: async (_, __, {user}) => {
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
                return new ApolloError(err, 500)
            }
        },
        enable2FA: async (_, __, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }

            try {
                let secret = speakeasy.generateSecret({
                    name: "IOffer"
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
                return new ApolloError(err, 500);

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
                let emailHtml = await forgetPasswordBody(user.userName, emailLink);
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
                        return new ApolloError(err, 500)
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
                        return new ApolloError(err, 500)
                    }
                }
            }
            return false
        },
        editUser: async (_, {newUser}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await User.findOneAndUpdate({_id: user.id}, newUser, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);

            }
        },
        deleteUser: async (_, args) => {
            try {
                return await User.findByIdAndRemove(args.id);
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        addKyc: async (_, args, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                const kyc = args;
                return await User.findOneAndUpdate({_id: args.id}, {$set: {kyc}}, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);
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
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        createAdmin: async (_, {email}, {user}) => {
            await EmailRules.validate({email}, {abortEarly: false});

            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let newUser = await User.findOneAndUpdate({email: email}, {$set: {type: Roles.SUPER_ADMIN}});
                if (!newUser) {
                    return new ApolloError("User Not Found. User Must Be Registered")
                }
                return true;
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        changePassword: async (_, {password, newPassword}, {user}) => {
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
                        return new ApolloError(err, 500)
                    }
                } else {
                    return new ApolloError("Invalid Password", 403)
                }

            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        registerUser: async (_, {newUser}) => {
            let {
                email,
                userName,
            } = newUser;
            console.log(User)
            await UserRegisterationRules.validate(newUser, {abortEarly: false});

            try {
                console.log("error", userName)

                // Validate Incoming New User Arguments
                // Check if the Username is taken
                console.log("User:", User)
                let user = await User.findOne({
                    userName
                });
                console.log("error1", user)
                // if (user) {
                //     return new ApolloError('Username Is Already Taken.', '403')
                // }
                console.log("error2")
                // Check is the Email address is already registered
                user = await User.findOne({
                    email
                });
                if (user) {
                    return new ApolloError('Email is already registered.', '403')
                }
                console.log("error4")
                user = new User(newUser);
                // Hash the user password
                user.password = await hash(user.password, 10);
                console.log("error4")
                // Save the user to the database
                let favorite = await Favorite({
                    user: user.id,
                }).save()
                let pin = await Pin({
                    user: user.id,
                }).save()
                let userSubscription = await UserSubscription({
                    user: user.id,
                }).save()
                let roleBaseAccess = await RoleBaseAccess({
                    user: user.id,
                }).save()
                user.favorites = favorite.id;
                user.subscriptions = userSubscription.id;
                user.pins = pin.id;
                user.roleBasedAccess = roleBaseAccess.id;
                console.log('User:', user)
                // let result = await user.save();
                let result = user

                let emailstr = {
                    id: user.id,
                    email: user.email
                }
                let userEmail = await serializeEmail(emailstr);
                let emailLink = await emailConfirmationUrl(userEmail);
                let emailHtml = await emailConfirmationBody(result.fullName, emailLink);
                try {
                    await sendEmail(result.email, emailLink, emailHtml);
                } catch (e) {
                    console.error(e)
                }

                result = await serializeUser(result);

                // Issue Token
                let token = await issueAuthToken(result);
                await user.save();
                return {
                    token,
                    user: result
                }
            } catch (err) {
                console.error(err)
                return new ApolloError(err, 500);
            }
        },
    },
}

module.exports = resolvers;
