import {User, Shop, Promotion, Tag, Brand, Category, Media} from "../../models";
import lodash from 'lodash'

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
import {Roles, Status, Verified} from "../../constants/enums";
import promotion from "../../models/promotion";

let fetchData = async () => {
    return await Promotion.find({}).notDeleted();
}

const resolvers = {
    Promotion: {
        shops: async (parent) => {
            return await Shop.find({_id: {$in: parent.shops}});
        },
        publisher: async (parent) => {
            return await User.findById(parent.publisher)
        },
        verifiedBy: async (parent) => {
            return await User.findById(parent.verifiedBy)
        },
        brand: async (parent) => {
            return await Brand.findById(parent.brand)
        },
        category: async (parent) => {
            return await Category.find({_id: {$in: parent.category}});
        },
        subCategory: async (parent) => {
            return await Category.find({_id: {$in: parent.subCategory}});
        },
        tags: async (parent) => {
            return await Tag.find({_id: {$in: parent.tags}});
        },
        media: async (parent) => {
            return await Media.find({_id: {$in: parent.media}});
        },
    },
    Query: {
        promotions: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            user = await User.findById(user.id).select({"_id": 1, "id": 1,"shops": 1,"brands": 1,"roleBasedAccess": 1}).populate([{
                path: 'roleBasedAccess',
                populate: [{
                    path: 'admin.brands',
                    select: {'promotions':1,'_id':0}
                }, {
                    path: 'admin.shops',
                    select: {'promotions':1,'_id':0}
                }, {
                    path: 'modifier.brands',
                    select: {'promotions':1,'_id':0}
                }, {
                    path: 'modifier.shops',
                    select: {'promotions':1,'_id':0}
                }, {
                    path: 'watcher.shops',
                    select: {'promotions':1,'_id':0}
                }, {
                    path: 'watcher.brands',
                    select: {'promotions':1,'_id':0}
                }],
                select: {'_id':0,'admin':1, 'modifier':1, 'watcher':1}
            }
            ,{
                path: 'brands',
                    select: {'promotions':1,'_id':0}
            },{
                path: 'shops',
                select: {'promotions':1,'_id':0}
            }
            ]);
            let res = getPropValues(user, "promotions");
            let userPromotions = new Set();
            res.forEach(promotionsArray=>{
                promotionsArray.forEach(promotion=>{
                    userPromotions.add(promotion.toString())
                })
            })
            let promotions = await Promotion.find({_id: {$in: [...userPromotions]}}).notDeleted();
            await getPromotionUserRelation(user.id, promotions)
            return promotions
        },
        promotionById: async (_, {id}, {user}) => {
            let promotion = await Promotion.findById(id);
            await getPromotionUserRelation(user.id)
            return promotion;
        },
        searchPendingPromotions: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                return await Promotion.find({'verified': Verified.PENDING});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchUpcomingPromotions: async (_, {shopId}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findById(shopId);
                if (shop) {
                    if (shop.owner.toString() === user.id.toString()) {
                        return await Promotion.find({shop: shopId, isUpcoming: true});
                    } else {
                        return new AuthenticationError("Unauthorised User", '401');
                    }
                } else {
                    return new AuthenticationError("Shop not found", '404');
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        searchArchivedPromotions: async (_, {shopId}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findById(shopId);
                if (shop) {
                    if (shop.owner.toString() === user.id.toString()) {
                        return await Promotion.find({shop: shopId, status: Status.ARCHIVED});
                    } else {
                        return new new AuthenticationError("Unauthorised User", 401);
                    }
                } else {
                    return new new AuthenticationError("Shop not found", 404);
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        // searchPromotions: async (_, {query}, {Shop}) => {
        //
        // }

    },
    Mutation: {
        createPromotion: async (_, {newPromotion}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (newPromotion.status === Status.PUBLISHED) {
                newPromotion['publisher'] = user._id;
                newPromotion['publishingDateTime'] = dateTime();
            }
            let brand = null;
            let shops = [];
            let brandShops = [];
            if (newPromotion.brand) {
                brand = await Brand.findById(newPromotion.brand);
                let invalidBrandedShop = null;
                if (newPromotion.shops) {
                    brand.brandShops.forEach((brandsShop) => {
                        brandShops.push(brandsShop.toString());
                    })
                    newPromotion.shops.forEach((shop) => {
                        if (!brandShops.includes(shop)) {
                            invalidBrandedShop = shop
                        }
                    })
                    if (invalidBrandedShop) {
                        let shop = await Shop.findById(invalidBrandedShop);
                        return new ApolloError('Invalid Branded Shop ' + shop.name + '. Select Branded Shops Only', 400)
                    }
                }
            } else {
                if (newPromotion.shops) {
                    for (let i = 0; i < newPromotion.shops.length; i++) {
                        let shop = await Shop.findById(newPromotion.shops[i]);
                        if (shop) {
                            shops.push(shop)
                            if (shop.brand) {
                                return new ApolloError('Invalid Shop ' + shop.name + '. Select non Branded Shops Only', 400)
                            }
                        } else {
                            return new ApolloError('Shop not found', 404);
                        }

                    }
                }
            }
            let promotion = Promotion({
                ...newPromotion,
            })
            await getPromotionUserRelation(user.id, promotion);
            console.log("promotion.user:", promotion)
            if (!(promotion.user === Roles.ADMIN || promotion.user === Roles.OWNER || promotion.user === Roles.MODIFIER)) {
                return new ApolloError(`Unauthorized, User Must Be OWNER, ADMIN or MODIFIER ${brand ? "of this brand or all the branded shops" : "of all these shops"}`, 400)
            }
            if (brand) {
                brand.promotions.push(promotion.id);
                await brand.save()
                if (!newPromotion.shops) {
                    await Shop.updateMany({_id: {$in: brand.brandShops}}, {$push: {promotions: promotion.id}});
                }
            }
            await Shop.updateMany({_id: {$in: newPromotion.shops}}, {$push: {promotions: promotion.id}});
            return await promotion.save()
        },
        editPromotion: async (_, {id, newPromotion}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            let promotion = await Promotion.findById(id);
            if (newPromotion.status === Status.PUBLISHED) {
                newPromotion['publisher'] = user._id;
                newPromotion['publishingDateTime'] = dateTime();
            }
            await Shop.updateMany({_id: {$in: promotion.shops}}, {$pull: {promotions: promotion.id}});
            await Brand.updateMany({_id: promotion.brand}, {$pull: {promotions: promotion.id}});
            let brand = null;
            let shops = [];
            let brandShops = [];
            if (newPromotion.brand) {
                brand = await Brand.findById(newPromotion.brand);
                let invalidBrandedShop = null;
                if (newPromotion.shops) {
                    brand.brandShops.forEach((brandsShop) => {
                        brandShops.push(brandsShop.toString());
                    })
                    newPromotion.shops.forEach((shop) => {
                        if (!brandShops.includes(shop)) {
                            invalidBrandedShop = shop
                        }
                    })
                    if (invalidBrandedShop) {
                        let shop = await Shop.findById(invalidBrandedShop);
                        return new ApolloError('Invalid Branded Shop ' + shop.name + '. Select Branded Shops Only', 400)
                    }
                }
            } else {
                if (newPromotion.shops) {
                    for (let i = 0; i < newPromotion.shops.length; i++) {
                        let shop = await Shop.findById(newPromotion.shops[i]);
                        shops.push(shop)
                        if (shop.brand) {
                            return new ApolloError('Invalid Shop ' + shop.name + '. Select non Branded Shops Only', 400)
                        }
                    }
                }
            }
            if (brand) {
                brand.promotions.push(promotion.id);
                await brand.save()
                if (!newPromotion.shops) {
                    await Shop.updateMany({_id: {$in: brand.brandShops}}, {$push: {promotions: promotion.id}});
                }
            }
            await Shop.updateMany({_id: {$in: newPromotion.shops}}, {$push: {promotions: promotion.id}});
            return Promotion.findByIdAndUpdate(id, {...newPromotion}, {new: true});
        },
        deletePromotion: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Promotion.findByIdAndUpdate(id, {status: Status.DELETED})
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        verifyPromotion: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let promotion = await Promotion.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                    if (!promotion) {
                        return new ApolloError("Promotion not found", 404);
                    }
                    return true
                } catch (err) {
                    return new ApolloError(err, 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", 401);
            }
        },
        archivePromotion: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Promotion.findByIdAndUpdate(id, {status: Status.ARCHIVED})
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        unArchivePromotion: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Promotion.findByIdAndUpdate(id, {status: Status.DRAFT})
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        clickPromotion: async (_, {id}) => {
            try {
                await Promotion.findByIdAndUpdate(id, {$inc: {clickCounts: 1}});
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        viewPromotion: async (_, {id}) => {
            try {
                await Promotion.findByIdAndUpdate(id, {$inc: {viewCounts: 1}});
                return true
            } catch (e) {
                return new ApolloError(e, 500)
            }
        }
    },
}

async function getPromotionUserRelation(userId, promotions = null) {
    console.log("userId: 👨🏻 ‍🎨", userId)
    if (promotions) {
        console.log("userId:", userId)
        if (Array.isArray(promotions)) {
            for (const promotion of promotions) {
                const i = promotions.indexOf(promotion);
                let relation = await promotion.getRelation(userId)
                promotions[i]._doc.user = relation;
                promotions[i].user = relation;
            }
        } else {
            console.log("userId:", userId)
            let relation = await promotions.getRelation(userId)
            console.log("relation:", relation)
            promotions._doc.user = relation;
            promotions.user = relation;
        }
    }
}
const getPropValues = (o, prop) =>
    (res => (JSON.stringify(o, (key, value) =>
        (key === prop && res.push(value), value)), res))([]);

module.exports = resolvers;
