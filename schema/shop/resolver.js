import {User, Promotion, Shop} from "../../models";
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
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {emailConfirmationUrl, emailConfirmationBody} from "../../utils/emailConfirmationUrl";
import {forgetPasswordUrl, forgetPasswordBody} from "../../utils/forgetPasswordUrl";
import speakeasy from "speakeasy";
import qrcode from "qrcode";


let fetchData = () => {
    return User.find();
}

const resolvers = {
    Shop: {
        promotions: async (parent) => {
            return await Promotion.find({"shop": parent.id})
        },
    },
    Query: {
        shops: () => {
            return fetchData()
        },
        shopById: async (_, args) => {
            return await Shop.findById(args.id);
        },
        searchPendingShops: async (_, {}, {user, Shop}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                return await Shop.find({'verified': "PENDING"});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchBlockedShops: async (_, {}, {user, Shop}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                return await Shop.find({"isBlocked": true, "confirmed": true});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        // searchShops: async (_, {query}, {Shop}) => {
        //
        // }

    },
    Mutation: {
        registerShop: async (_, {newShop}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = Shop({
                    ...newShop,
                    owner: user.id,
                    publishingDateTime: dateTime()
                })
                let result = null;
                try{
                    result = await shop.save();
                    let response = await User.findById(user.id);
                    console.log('response:', response)
                    response.shops.push(result.id);
                    console.log('response2:', response)
                    await response.save();
                }catch (e) {
                    return  new ApolloError("Unable to save Shop", 500)
                }
                return result;
            } catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        editShop: async (_, {id, newShop}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await Shop.findOneAndUpdate({_id: id}, newShop, {new: true});
            } catch (err) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        deleteShop: async (_, {id}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === "ADMIN") {
                    await Shop.findByIdAndRemove(id);
                    return true
                } else {
                    await Shop.findOneAndRemove({id: id, owner: user.id});
                    return true
                }
            } catch (e) {
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        verifyShop: async (_, {id}, {user, Shop}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                try {
                    let response = await Shop.findByIdAndUpdate(id, {$set: {"verified": "VERIFIED"}});
                    if (!response) {
                        return new ApolloError("Shop not found", '404');
                    }
                    return true
                } catch (err) {
                    throw new ApolloError("Internal Server Error", '500')
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        blockShop: async (_, {id}, {user, Shop}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === 'ADMIN') {
                    let blockingShop = await Shop.findById(id);
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: true});
                    if (!response) {
                        return new ApolloError("Shop Not Found", '404')
                    }
                    return true;
                }
            } catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        inviteModerators: async (_, {id,emails}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findOne({_id: id, owner:user.id});
                if (shop){
                    for(email of emails){
                        await EmailRules.validate({email}, {abortEarly: false});
                        let emailLink = await emailConfirmationUrl(email);
                        //TODO change emailConfirmBody()
                        let emailHtml = await emailConfirmationBody(user.fullName, emailLink);
                        try{
                            await sendEmail(email, emailLink, emailHtml)
                        }catch (e) {
                            return new ApolloError(`Email Sending Failed to ${email}`, 500);
                        }
                    }
                }
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        addModerator: async (_, {id,userID}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await Shop.findOneAndUpdate({_id: id}, {$push: {moderators:userID}}, {new: true});
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        clickShop:async (_, {id}, {Shop})=>{
            try{
                let shop = Shop.findById(id)
                shop.clickCounts++
                shop.save()
                return true
            }catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        viewShop:async (_, {id}, {Shop})=>{
            try{
                let shop = Shop.findById(id)
                shop.viewCounts++
                shop.save()
                return true
            }catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        }
    },
}

module.exports = resolvers;
