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
import {emailConfirmationUrl, emailShopInviteUrl, emailInviteBody} from "../../utils/emailConfirmationUrl";
import {Roles, Status, Verified} from "../../constants/enums";
import ShopRoleBaseAccessInvite from "../../models/shopRoleBaseAccessInvite";
import {verify} from "jsonwebtoken";
import {SECRET} from "../../config";

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
                    let invitedUser = await User.findOne({email: email})
                    let invited = null;
                    if (invitedUser) {
                        invited = invitedUser.id;
                        console.log('invited:', invited)
                        await getShopUserRelation(invitedUser.id, shop)
                        console.log('shop:', shop.user)
                    }
                    let shopRoleBaseAccessInvite = await ShopRoleBaseAccessInvite.findOne({
                        invitedEmail: email,
                        shop: shop.id,
                        isDeleted: false,
                    })

                    if (shop.user) {
                        return new ApolloError(`User has already Joined as ${shop.user}`, 400)
                    }
                    if (shopRoleBaseAccessInvite) {
                        console.log("shopRoleBaseAccessInvite:", shopRoleBaseAccessInvite)
                        if (shopRoleBaseAccessInvite.isExpired) {
                            shopRoleBaseAccessInvite.isExpired = true;
                        } else {
                            return new ApolloError(`Already Invited as ${shopRoleBaseAccessInvite.role}`, 400)
                        }
                        shopRoleBaseAccessInvite.isDeleted = true;
                        shop.roleBasedAccessInvites = lodash.remove(shop.roleBasedAccessInvites, shopRoleBaseAccessInvite.id)
                        await shopRoleBaseAccessInvite.save()
                    }
                    shopRoleBaseAccessInvite = new ShopRoleBaseAccessInvite({
                        user: user.id,
                        invited,
                        invitedEmail: email,
                        role,
                        shop: shop.id,
                        expiresAt: Date.now() + 86400000
                    });
                    let emailLink = await emailShopInviteUrl(shopRoleBaseAccessInvite);
                    shopRoleBaseAccessInvite.inviteLink = emailLink;
                    //TODO change emailConfirmBody()
                    try {
                        let emailHtml = await emailInviteBody(shopRoleBaseAccessInvite, emailLink);
                        await sendEmail(email, emailLink, emailHtml)
                    } catch (e) {
                        return new ApolloError(`Email Sending Failed to ${email}`, 500);
                    }
                    await shopRoleBaseAccessInvite.save();
                    shop.roleBasedAccessInvites.push(shopRoleBaseAccessInvite.id)
                    shop.save();
                    return true
                } else {
                    return new ApolloError('Shop not found', 404)
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        acceptShopInvite: async (_, {token}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            user = await User.findById(user.id);
            console.log("user:", user)
            console.log("token: ", token)
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
            console.log("decodedToken:", decodedToken)

            // If the user has valid token then Find the user by decoded token's id
            let shopRoleBaseAccessInvite = await ShopRoleBaseAccessInvite.findById(decodedToken.jwtPayload.id);
            if (shopRoleBaseAccessInvite) {
                if (shopRoleBaseAccessInvite.isExpired) {
                    return new AuthenticationError("Token is Expired. Ask to invite you again.", '401');
                }
                if (shopRoleBaseAccessInvite.isAccepted) {
                    return new AuthenticationError("This invitation has been used.", '401');
                }
                if (shopRoleBaseAccessInvite.isDeleted) {
                    return new AuthenticationError("Invite has been Deleted. Ask to invite you again.", '401');
                }
                console.log("shopRoleBaseAccessInvite:", shopRoleBaseAccessInvite)
                if (user.email === decodedToken.jwtPayload.invitedEmail) {
                    let shop = await Shop.findById(shopRoleBaseAccessInvite.shop);
                    console.log("user:", user)
                    let roleBasedAccess = await RoleBaseAccess.findById(user.roleBasedAccess)
                    if (shopRoleBaseAccessInvite.role === 'ADMIN') {
                        shop.admins.push(user.id);
                        roleBasedAccess.admin.shops.push(shop.id);
                    } else if (shopRoleBaseAccessInvite.role === 'MODIFIER') {
                        shop.modifiers.push(user.id);
                        roleBasedAccess.modifier.shops.push(shop.id);

                    } else if (shopRoleBaseAccessInvite.role === 'WATCHER') {
                        shop.watchers.push(user.id);
                        roleBasedAccess.watcher.shops.push(shop.id);

                    } else {

                    }
                    shopRoleBaseAccessInvite.isAccepted = true;
                    shopRoleBaseAccessInvite.isDeleted = true;
                    await shop.save();
                    await shopRoleBaseAccessInvite.save();
                    await roleBasedAccess.save();
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User's token.", '401');
                }
            }

        },
        removeShopModerator: async (_, {id, email, role}, {user}) => {
            try {
                let shop = await Shop.findById(id);
                if(user.email === email){
                    return new AuthenticationError("Cannot remove your self.", '401');
                }
                if (shop) {
                    let shopRoleBaseAccessInvites = await ShopRoleBaseAccessInvite.find({
                        invitedEmail: email,
                        shop: shop.id,
                        isDeleted: false
                    }, {isDeleted: true})
                    await ShopRoleBaseAccessInvite.updateMany({
                        invitedEmail: email,
                        shop: shop.id,
                        isDeleted: false
                    }, {isDeleted: true})
                    shopRoleBaseAccessInvites.forEach((shopRoleBaseAccessInvite) => {
                        lodash.remove(shop.roleBasedAccessInvites, shopRoleBaseAccessInvite.id)
                    })
                    let invitedUser = await User.findOne({email})
                    if (invitedUser) {
                        if (role === Roles.ADMIN) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {admins: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"admin.shops":[shop.id]}})

                        } else if (role === Roles.MODIFIER) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {modifiers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"modifier.shops":[shop.id]}})

                        } else if (role === Roles.WATCHER) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {watchers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"watcher.shops":[shop.id]}})
                        }
                    }
                    return true
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
        console.log("userId:", userId)
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
