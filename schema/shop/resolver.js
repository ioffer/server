import {User, Promotion, Shop, Tag, Category, Media, Brand, RoleBaseAccess} from "../../models";
import lodash from "lodash"

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
import ShopRoleBaseAccessInvite from "../../models/shopRoleBaseAccessInvite";

let fetchData = async () => {
    return await Shop.find({});
}

const resolvers = {
    Shop: {
        promotions: async (parent) => {
            return await Promotion.find({_id: {$in: parent.promotions}});
        },
        brand: async (parent) => {
            return await Brand.findById(parent.brand)
        },
        tags: async (parent) => {
            return await Tag.find({_id: {$in: parent.tags}});
        },
        admins: async (parent) => {
            return await User.find({_id: {$in: parent.admins}});
        },
        modifiers: async (parent) => {
            return await User.find({_id: {$in: parent.modifiers}});
        },
        watchers: async (parent) => {
            return await User.find({_id: {$in: parent.watchers}});
        },
        category: async (parent) => {
            return await Category.find({_id: {$in: parent.category}});
        },
        subCategory: async (parent) => {
            return await Category.find({_id: {$in: parent.subCategory}});
        },
        owner: async (parent) => {
            return await User.findById(parent.owner);
        },
        logo: async (parent) => {
            return await Media.findById(parent.logo);
        },
        coverImage: async (parent) => {
            return await Media.findById(parent.coverImage);
        },

    },
    Query: {
        shops: async (_, {}, {user}) => {
            let shops = await Shop.find({}).published();
            await getShopUserRelation(user.id, shops)
            return shops
        },
        publishedShops: async (_, {}, {user}) => {
            let shops = await Shop.find({}).published();
            await getShopUserRelation(user.id, shops)
            return shops
        },
        allShops: async (_, {}, {user}) => {
            let shops = await fetchData()
            await getShopUserRelation(user.id, shops)
            return shops
        },
        shopById: async (_, {id}, {user}) => {
            console.log("user", user)
            let shop = await Shop.findById(id);
            console.log("here")
            await getShopUserRelation(user.id, shop)
            console.log("heree")
            return shop
        },
        searchPendingShops: async (_, {}, {user}) => {
            let shops = await Shop.find({}).pending();
            await getShopUserRelation(user.id, shops)
            return shops
        },
        searchBlockedShops: async (_, {}, {user}) => {
            let shops = await Shop.find({}).blocked();
            await getShopUserRelation(user.id, shops)
            return shops
        },
        // searchShops: async (_, {query}, {Shop}) => {
        //
        // }

    },
    Mutation: {
        registerShop: async (_, {newShop}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let tags = [];
                if (newShop.tags) {
                    tags = [...new Set(newShop.tags)];
                }
                let shop = Shop({
                    ...newShop,
                    owner: user.id,
                    publishingDateTime: dateTime()
                })
                if (newShop["brand"] !== undefined) {
                    await Brand.findByIdAndUpdate(newShop.brand, {$push: {brandShops: shop.id}});
                }
                console.log('shop', shop)
                if (tags) {
                    for (let i = 0; i < tags.length; i++) {
                        if (tags[i] !== "") {
                            let tag = await Tag.findById(tags[i]);
                            if (!tag.shops.includes(shop.id)) {
                                tag.shops.push(shop.id);
                                let tagData = await tag.save();
                                console.log("tagData", tagData);
                            }
                        }
                    }
                }
                let result = await shop.save();
                console.log("result", result);
                console.log("user3", user);
                let userRes = await User.findById(user._id);
                console.log('response:', userRes)
                userRes.shops.push(result.id);
                console.log('response2:', userRes)
                await userRes.save();
                return result;
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        editShop: async (_, {id, newShop}, {user}) => {
            try {
                if (newShop.tags) {
                    let tagsSet = new Set(newShop.tags);
                    tagsSet.delete('')
                    newShop.tags = [...tagsSet];
                }
                console.log("newShop", newShop)
                return await Shop.findOneAndUpdate({_id: id}, newShop, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        deleteShop: async (_, {id}, {user}) => {
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        archiveShop: async (_, {id}, {user}) => {
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.ARCHIVED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        unArchiveShop: async (_, {id}, {user}) => {
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.DRAFT}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        verifyShop: async (_, {id}, {user}) => {
            try {
                let response = await Shop.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                if (!response) {
                    return new ApolloError("Shop not found", '404');
                }
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        blockShop: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: true});
                    if (!response) {
                        return new ApolloError("Shop Not Found", '404')
                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        inviteShopModerator: async (_, {id, email, role}, {user}) => {
            try {
                let shop = await Shop.findById(id);
                if (shop) {
                    await EmailRules.validate({email}, {abortEarly: false});
                    let emailLink = await emailShopInviteUrl(email);
                    //TODO change emailConfirmBody()
                    let emailHtml = await emailConfirmationBody(user.fullName, emailLink);
                    let invitedUser = await User.find({email: email})
                    try {
                        let invited = null;
                        await sendEmail(email, emailLink, emailHtml)
                        if (user) {
                            invited = invitedUser.id;
                        }
                        let shopRoleBaseAccessInvite = new ShopRoleBaseAccessInvite({
                            user: user.id,
                            invited,
                            invitedEmail: email,
                            role,
                            shop: shop.id,
                            inviteLink: emailLink,
                            expiresAt: Date.now() + 86400000
                        });
                        await shopRoleBaseAccessInvite.save();
                    } catch (e) {
                        return new ApolloError(`Email Sending Failed to ${email}`, 500);
                    }
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        removeShopModerator: async (_, {id, email, role}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findById(id);
                if(shop){
                    let shopRoleBaseAccessInvite = await ShopRoleBaseAccessInvite.findOneAndUpdate({invitedEmail:email, shop:shop.id},{isDeleted:true})
                    return await Shop.findOneAndUpdate({_id: id}, {$push: {moderators: userID}}, {new: true});
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        clickShop: async (_, {id}) => {
            try {
                await Shop.findByIdAndUpdate(id, {$inc: {clickCounts: 1}});
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        viewShop: async (_, {id}) => {
            try {
                await Shop.findByIdAndUpdate(id, {$inc: {viewCounts: 1}});
                return true
            } catch (e) {
                return new ApolloError(e, 500)
            }
        }
    },
}

async function getShopUserRelation(userId, shops = null) {
    if (shops) {
        if (Array.isArray(shops)) {
            for (const shop of shops) {
                const i = shops.indexOf(shop);
                let relation = await shop.getRelation(userId)
                shops[i]._doc.user = relation;
                shops[i].user = relation;
            }
        } else {
            let relation = await shops.getRelation(userId)
            shops._doc.user = relation;
            shops.user = relation;
        }
    }
}

module.exports = resolvers;
