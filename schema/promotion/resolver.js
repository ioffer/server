import {User, Shop, Promotion} from "../../models";
import _ from 'lodash'
const {serializeUser, issueAuthToken, serializeEmail} = require('../../serializers')
const {
    UserRegisterationRules,
    UserAuthenticationRules,
    EmailRules,
    PasswordRules,
    UserRules
} = require('../../validations');
import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {emailConfirmationUrl, emailConfirmationBody} from "../../utils/emailConfirmationUrl";

let fetchData = () => {
    return Promotion.find();
}

const resolvers = {
    Promotion: {
        shops: async (parent) => {
            return await Shop.find({"id": parent.shop})
        },
        publisher: async (parent)=>{
            return await User.find({'id':parent.publisher})
        },
        verifiedBy: async (parent)=>{
            return await User.find({'id':parent.verifiedBy})
        }
    },
    Query: {
        promotions: () => {
            return fetchData()
        },
        promotionById: async (_, args) => {
            return await Promotion.findById(args.id);
        },
        promotionByShop: async (_, {shopID},{Promotion, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let shop = await Shop.findById(shopID);
                if(shop.owner===user.id||shop.moderators.includes(user.id)){
                    return await Promotion.find({shop:shopID});
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        searchPendingPromotions: async (_, {}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                return await Promotion.find({'verified': "PENDING"});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchHiddenPromotions: async (_, {shopID}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let shop = await Shop.findById(shopID);
                if(shop.owner===user.id||shop.moderators.includes(user.id)){
                    return await Promotion.find({shop:shopID,hidden:true});
                }else{
                    return new AuthenticationError("Unauthorised User", '401');
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        searchArchivedPromotions: async (_, {shopID}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let shop = await Shop.findById(shopID);
                if(shop.owner===user.id||shop.moderators.includes(user.id)){
                    return await Promotion.find({shop:shopID,hidden:true});
                } else {
                    return new new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        searchPromotions: async (_, {query}, {Shop}) => {

        }

    },
    Mutation: {
        createPromotion: async (_, {shopID,newPromotion}, {Promotion, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let shop = await Shop.findById(shopID);
                if(shop.owner===user.id||shop.moderators.includes(user.id)){
                    let promotion = Promotion({
                        ...newPromotion,
                        publisher:user.id,
                        publishingDateTime:Date(),
                        shop:shopID,
                    })
                    shop.promotions.push(promotion)
                    await shop.save()
                    return await promotion.save();
                } else {
                    return new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        editPromotion: async (_, {id}, {Promotion, user}) => {
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
        InviteModerator: async (_, {id,emails}, {Shop, user}) => {
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
