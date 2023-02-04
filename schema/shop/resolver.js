import {Brand, Category, Media, Promotion, RoleBaseAccess, Shop, Tag, User} from "../../models";
import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {emailInviteBody, emailShopInviteUrl} from "../../utils/emailConfirmationUrl";
import {Models, ModelsCollections, Roles, Status, Verified} from "../../constants/enums";
import ShopRoleBaseAccessInvite from "../../models/shopRoleBaseAccessInvite";
import {verify} from "jsonwebtoken";
import {SECRET} from "../../config";
import Subscription from "../../models/subscription";
import BrandRoleBaseAccessInvite from "../../models/brandRoleBaseAccessInvite";
import {getShopUserRelation, arrayRemove, getOptionsArguments, getBrandUserRelation} from '../../helpers/userRelations'
import {getPaginations} from "../../utils/paginator";
import {modelArrayManager} from "../../helpers/modelsHelpers";
import {createNotification, getAllModeratorsWithNotificationToken} from "../../helpers/handleNotification";

const {
    EmailRules,
} = require('../../validations');


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
        verifiedBy: async (parent) => {
            return await User.findById(parent.verifiedBy);
        },
        subscribers: async (parent) => {
            return await User.find({_id: {$in: parent.subscribers}});
        },
        roleBaseAccessInvites: async (parent) => {
            return await ShopRoleBaseAccessInvite.find({_id: {$in: parent.roleBaseAccessInvites}});
        },

    },
    Query: {
        shops: async (_, {options}, {user, isAuth}) => {
            options = getOptionsArguments(options)
            let {
                page,
                limit,
                sort,
                where
            } = options;
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            user = await User.findById(user.id).populate('roleBasedAccess');
            let userShops = [];
            userShops = [
                ...user.shops,
                ...user.roleBasedAccess.admin.shops,
                ...user.roleBasedAccess.modifier.shops,
                ...user.roleBasedAccess.watcher.shops
            ]
            userShops.forEach((shop, index) => {
                userShops[index] = shop.toString();
            })
            userShops = new Set([...userShops])
            where = {
                ...where,
                _id: {$in: [...userShops]}
            }
            let pagination = await getPaginations(ModelsCollections.Shop, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let shops = await Shop.find({_id: {$in: [...userShops]}}).paginate(options);
            await getShopUserRelation(user.id, shops)
            return {shops, pagination};
        },
        publishedShops: async (_, {options}, {}) => {
            options = getOptionsArguments(options)
            let {
                page,
                limit,
                sort,
                where
            } = options;
            where = {
                ...where,
                status: Status.PUBLISHED
            }
            let pagination = await getPaginations(ModelsCollections.Shop, page, limit, where, sort)
            options["offset"] = pagination.offset;
            return await Shop.find({}).paginate(options).published()
        },
        allShops: async (_, {options}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            } else {
                if (user.role !== Roles.SUPER_ADMIN) {
                    return new ApolloError("User Must Be Super Admin", '400')
                }
                options = getOptionsArguments(options)
                let {
                    page,
                    limit,
                    sort,
                    where
                } = options;
                let pagination = await getPaginations(ModelsCollections.Shop, page, limit, where, sort)
                options["offset"] = pagination.offset;
                let shops =  await Shop.find({}).paginate(options);
                return {shops, pagination}
            }
        },
        shopById: async (_, {id}, {user}) => {
            let shop = await Shop.findById(id);
            if (user) {
                await getShopUserRelation(user.id, shop)
            }
            if (shop.status === Status.PUBLISHED || shop.user || user.role === Roles.SUPER_ADMIN) {
                return shop;
            }
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided for unpublished brand")
            } else {
                return new ApolloError("Shop Not Found", '404')
            }
        },
        searchPendingShops: async (_, {options}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.role !== Roles.SUPER_ADMIN) {
                return new ApolloError("User Must Be Super Admin", '400')
            }
            options = getOptionsArguments(options)
            let {
                page,
                limit,
                sort,
                where
            } = options;
            where = {
                ...where,
                verified:Verified.PENDING
            }
            let pagination = await getPaginations(ModelsCollections.Shop, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let shops = await Shop.find({}).paginate(options).pending();
            await getShopUserRelation(user.id, shops);
            return {shops, pagination};
        },
        searchBlockedShops: async (_, {options}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.role !== Roles.SUPER_ADMIN) {
                return new ApolloError("User Must Be Super Admin", '400')
            }
            options = getOptionsArguments(options)
            let {
                page,
                limit,
                sort,
                where
            } = options;
            where = {
                ...where,
                isBlocked: true
            }
            let pagination = await getPaginations(ModelsCollections.Shop, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let shops = await Shop.find({}).paginate(options).blocked();
            await getShopUserRelation(user.id, shops);
            return {shops, pagination};
        },
        moderatorsByShopId: async (_, {id}, {user}) => {
            let shop = await Shop.findById(id);
            if (!shop){
                return new ApolloError("Shop Not Found", '404')
            }
            let  shopRoleBaseAccessInvite = await ShopRoleBaseAccessInvite.find({_id: {$in: shop.roleBaseAccessInvites}});
            return shopRoleBaseAccessInvite
        }
        // searchShops: async (_, {query}, {Shop}) => {
        //
        // }

    },
    Mutation: {
        registerShop: async (_, {newShop}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let slug = newShop.name;
                let owner = user.id;
                let shop = Shop({
                    ...newShop,
                    owner: owner,
                    publishingDateTime: dateTime()
                })
                if (newShop["brand"] !== undefined) {
                    let brand = await Brand.findById(newShop.brand);
                    console.log(user.id," === ",brand.owner.toString()," || is admin=>",brand.admins.includes(user.id))
                    if (user.id === brand.owner.toString() || brand.admins.includes(user.id)) {
                        owner = brand.owner;
                    } else {
                        return new AuthenticationError("Authentication Failed. User must be brand owner or admin.")
                    }
                    await Brand.findByIdAndUpdate(newShop.brand, {$push: {brandShops: shop.id}});
                }
                console.log('shop', shop)
                if (newShop.tags) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Tag, "shops", [], newShop.tags, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Tag Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    shop.tags = newArray;
                }
                if (newShop.category) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "shops", [], newShop.category, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Catergory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    shop.category = newArray
                }
                if (newShop.subCategory) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "shops", [], newShop.subCategory, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Subcategory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    shop.subCategory = newArray
                }
                shop.slug = slug
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
        editShop: async (_, {id, newShop}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = new Shop.findById(id);
                let slug = newShop.name;
                let preTags = shop.tags
                let preCategories = shop.category
                let preSubCategories = shop.subCategory
                if (newShop.tags) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Tag, "shops", preTags, newShop.tags, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Tag Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newShop.tags = newArray;
                }
                if (newShop.category) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "shops", preCategories, newShop.category, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Catergory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newShop.category = newArray
                }
                if (newShop.subCategory) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "shops", preSubCategories, newShop.subCategory, shop.id);
                    if (!status) {
                        return new ApolloError("Error in Subcategory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newShop.subCategory = newArray
                }
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                    let notification = {
                        description: `${user.fullName} edited a Shop ${shop.name}`,
                        entity: shop.id,
                        entityType: Models.Shop,
                        link: `http://localhost:3000/shop/details/${shop.id}`,
                        messageBody: `${user.fullName} edited a Shop ${shop.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {
                    console.log(e)
                }
                console.log("newShop", newShop)
                return await Shop.findOneAndUpdate({_id: id}, newShop, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        deleteShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        archiveShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findOneAndUpdate({_id: id}, {status: Status.ARCHIVED}, {new: true});
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                    let notification = {
                        description: `${user.fullName} archived a Shop ${shop.name}`,
                        entity: shop.id,
                        entityType: Models.Shop,
                        link: `http://localhost:3000/shop/details/${shop.id}`,
                        messageBody: `${user.fullName} archived a Shop ${shop.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {
                    console.log(e)
                }
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        unArchiveShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findOneAndUpdate({_id: id}, {status: Status.DRAFT}, {new: true});
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                    let notification = {
                        description: `${user.fullName} unarchived a Shop ${shop.name}`,
                        entity: shop.id,
                        entityType: Models.Shop,
                        link: `http://localhost:3000/shop/details/${shop.id}`,
                        messageBody: `${user.fullName} unarchived a Shop ${shop.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {
                    console.log(e)
                }
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        verifyShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let response = await Shop.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                    if (!response) {
                        return new ApolloError("Shop not found", '404');
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                        let notification = {
                            description: `${user.fullName} verified your Shop ${shop.name}`,
                            entity: shop.id,
                            entityType: Models.Shop,
                            link: `http://localhost:3000/shop/details/${shop.id}`,
                            messageBody: `${user.fullName} verified Shop ${shop.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {
                        console.log(e)
                    }
                    return true
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        blockShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: true});
                    if (!response) {
                        return new ApolloError("Shop Not Found", '404')
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                        let notification = {
                            description: `${user.fullName} blocked your Shop ${shop.name}`,
                            entity: shop.id,
                            entityType: Models.Shop,
                            link: `http://localhost:3000/shop/details/${shop.id}`,
                            messageBody: `${user.fullName} blocked your Shop ${shop.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {
                        console.log(e)
                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        unblockShop: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: false});
                    if (!response) {
                        return new ApolloError("Shop Not Found", '404')
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                        let notification = {
                            description: `${user.fullName} unblocked your Shop ${shop.name}`,
                            entity: shop.id,
                            entityType: Models.Shop,
                            link: `http://localhost:3000/shop/details/${shop.id}`,
                            messageBody: `${user.fullName} unblocked your Shop ${shop.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {
                        console.log(e)
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
                        await getShopUserRelation(invitedUser.id, shop)
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
                        shop.roleBaseAccessInvites = arrayRemove(shop.roleBaseAccessInvites, shopRoleBaseAccessInvite.id)
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
                    shop.roleBaseAccessInvites.push(shopRoleBaseAccessInvite.id)
                    shop.save();
                    if(invited){
                        try {
                            let notificationsUsers = [];
                            notificationsUsers.push(invitedUser)
                            let notification = {
                                description: `${user.fullName} invited you to Shop ${shop.name}`,
                                entity: shopRoleBaseAccessInvite.id,
                                entityType: Models.ShopRoleBaseAccessInvite,
                                link: `http://localhost:3000/shop/details/${shop.id}`,
                                messageBody: `${user.fullName} invited you to Shop ${shop.name}`,
                                messageTitle: `${user.fullName}`,
                                title: `${user.fullName}`,
                                sender:user.id,
                            }
                            console.log("notification 📩:", notification)
                            await createNotification(notification,notificationsUsers);
                        }catch (e) {
                            console.log(e)
                        }
                    }
                    return true
                } else {
                    return new ApolloError('Shop not found', 404)
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        acceptShopInvite: async (_, {token}, {user, isAuth}) => {
            if (!isAuth) {
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
                    shopRoleBaseAccessInvite.invited = user.id;
                    shopRoleBaseAccessInvite.status = Status.ACCEPTED;
                    await shop.save();
                    await shopRoleBaseAccessInvite.save();
                    await roleBasedAccess.save();
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Shop,shop.id);
                        let notification = {
                            description: `${user.fullName} joined Shop ${shop.name}`,
                            entity: shop.id,
                            entityType: Models.Shop,
                            link: `http://localhost:3000/shop/details/${shop.id}`,
                            messageBody: `${user.fullName} joined Shop ${shop.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {
                        console.log(e)
                    }
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User's token.", '401');
                }
            }

        },
        removeShopModerator: async (_, {id, email, role}, {user}) => {
            try {
                let shop = await Shop.findById(id);
                if (user.email === email) {
                    return new AuthenticationError("Cannot remove your self.", '401');
                }
                if (shop) {
                    let shopRoleBaseAccessInvites = await ShopRoleBaseAccessInvite.find({
                        invitedEmail: email,
                        shop: shop.id,
                        isDeleted: false
                    })
                    await ShopRoleBaseAccessInvite.updateMany({
                        invitedEmail: email,
                        shop: shop.id,
                        isDeleted: false
                    }, {isDeleted: true, status:Status.DELETED})
                    shopRoleBaseAccessInvites.forEach((shopRoleBaseAccessInvite) => {
                        shop.roleBaseAccessInvites = arrayRemove(shop.roleBaseAccessInvites, shopRoleBaseAccessInvite.id)
                    })
                    await shop.save();
                    let invitedUser = await User.findOne({email})
                    if (invitedUser) {
                        if (role === Roles.ADMIN) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {admins: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"admin.shops": [shop.id]}})

                        } else if (role === Roles.MODIFIER) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {modifiers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"modifier.shops": [shop.id]}})

                        } else if (role === Roles.WATCHER) {
                            await Shop.findOneAndUpdate({_id: id}, {$pullAll: {watchers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"watcher.shops": [shop.id]}})
                        }
                    }
                    try {
                        let notificationsUsers = [];
                        notificationsUsers.push(invitedUser)
                        let notification = {
                            description: `${user.fullName} removed you from Shop ${shop.name}`,
                            entity: shop.id,
                            entityType: Models.Shop,
                            link: `http://localhost:3000/shop/details/${shop.id}`,
                            messageBody: `${user.fullName} removed you from Shop ${shop.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {
                        console.log(e)
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
        },
        toggleSubscribeShop: async (_, {id}, {user}) => {
            try {
                let shop = await Shop.findById(id)
                user = await User.findById(user.id)
                console.log("user:", user)
                let subscription = await Subscription.findById(user.subscriptions)
                console.log("subscription:", subscription)
                if (!subscription) {
                    subscription = new Subscription({
                        user: user.id
                    })
                    user.subscriptions = subscription.id
                    await user.save()
                }
                if (shop.brand) {
                    let brand = await Brand.findById(shop.brand)
                    if (subscription.brands.includes(brand.id)) {
                        console.log("removing brand")
                        subscription.brands = arrayRemove(subscription.brands, brand.id)
                        brand.subscribers = arrayRemove(brand.subscribers, user.id)
                    } else {
                        subscription.brands.push(brand.id)
                        brand.subscribers.push(user.id)
                    }
                    await brand.save()
                } else {
                    console.log("shop", shop, subscription.shops.includes(shop.id))
                    if (subscription.shops.includes(shop.id)) {
                        console.log("removing shop")
                        subscription.shops = arrayRemove(subscription.shops, shop.id)
                        shop.subscribers = arrayRemove(shop.subscribers, user.id)
                    } else {
                        console.log("adding shop")
                        subscription.shops.push(shop.id)
                        shop.subscribers.push(user.id)
                    }
                }
                console.log("final subscription:", subscription)
                await shop.save()
                await subscription.save()
                return true
            } catch (e) {
                return new ApolloError(e, 500)
            }
        }
    },
}


module.exports = resolvers;
