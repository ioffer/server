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
        shop: async (parent) => {
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
        // searchPromotions: async (_, {query}, {Shop}) => {
        //
        // }

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
        editPromotion: async (_, {id, newPromotion}, {Promotion, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let promotion = await Promotion.findById(id);
                let shop = await Shop.findById(promotion.shop);
                if(shop.owner===user.id||shop.moderators.includes(user.id)){
                    return await Promotion.findByIdAndUpdate(id,newPromotion)
                } else {
                    return new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        deleteShop: async (_, {id}, {Promotion, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let promotion = await Promotion.findById(id);
                let shop = await Shop.findById(promotion.shop);
                if(shop.owner === user.id||shop.moderators.includes(user.id)){
                    await Promotion.findByIdAndRemove(id)
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        verifyPromotion: async (_, {id}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === "ADMIN") {
                try {
                    let response = await Promotion.findByIdAndUpdate(id, {$set: {"verified": "VERIFIED"}});
                    if (!response) {
                        return new ApolloError("Promotion not found", 404);
                    }
                    return true
                } catch (err) {
                    throw new ApolloError("Internal Server Error", 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", 401);
            }
        },
        hidePromotion: async (_, {id}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let promotion = await Promotion.findById(id);
                let shop = await Shop.findById(promotion.shop);
                if(shop.owner === user.id||shop.moderators.includes(user.id)){
                    await Promotion.findByIdAndUpdate(id,{hidden: true})
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        archivePromotion: async (_, {id}, {user, Promotion}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let promotion = await Promotion.findById(id);
                let shop = await Shop.findById(promotion.shop);
                if(shop.owner === user.id||shop.moderators.includes(user.id)){
                    await Promotion.findByIdAndUpdate(id,{archived: true})
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User", 401);
                }
            }catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        clickShop:async (_, {id}, {Promotion})=>{
            try{
                let promotion = Promotion.findById(id)
                promotion.clickCounts++
                promotion.save()
                return true
            }catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        viewShop:async (_, {id}, {Promotion})=>{
            try{
                let promotion = Promotion.findById(id)
                promotion.viewCounts++
                promotion.save()
                return true
            }catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        }
    },
}

module.exports = resolvers;
