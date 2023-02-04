import {User, Promotion, Shop, Brand, Media, Tag, BrandView, BrandClick, Category} from "../../models";
import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {
    emailBrandInviteUrl,
    emailInviteBody
} from "../../utils/emailConfirmationUrl";
import {Roles, Verified, Status, ModelsCollections, Models} from "../../constants/enums";
import BrandRoleBaseAccessInvite from "../../models/brandRoleBaseAccessInvite";
import {EmailRules} from "../../validations";
import RoleBaseAccess from "../../models/roleBaseAccess";
import brand from "../../models/brand";
import Subscription from "../../models/subscription";
import {verify} from "jsonwebtoken";
import {SECRET} from "../../config";
import {getBrandUserRelation, arrayRemove, getShopUserRelation, getOptionsArguments} from '../../helpers/userRelations'
import {getPaginations} from "../../utils/paginator";
import {modelArrayManager} from "../../helpers/modelsHelpers";
import {
    createNotification, getAllModeratorsWithNotificationToken,
    getAllUsersWithNotificationToken
} from "../../helpers/handleNotification";

const resolvers = {
    Brand: {
        logo: async (parent) => {
            return await Media.findById(parent.logo);
        },
        coverImage: async (parent) => {
            return await Media.findById(parent.coverImage);
        },
        promotions: async (parent) => {
            return await Promotion.find({"brand": parent.id})
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
        brandShops: async (parent, _, {user}) => {
            let shops = await Shop.find({_id: {$in: parent.brandShops}});
            await getShopUserRelation(user.id, shops);
            return shops
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
        subscribers: async (parent) => {
            return await User.find({_id: {$in: parent.subscribers}});
        },
        roleBaseAccessInvites: async (parent) => {
            return await BrandRoleBaseAccessInvite.find({_id: {$in: parent.roleBaseAccessInvites}});
        },
        owner: async (parent) => {
            return await User.findById(parent.owner);
        },
        verifiedBy: async (parent) => {
            return await User.findById(parent.verifiedBy);
        },

    },
    Query: {
        brands: async (_, {options}, {user, isAuth}) => {
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
            let userBrands = [];
            userBrands = [
                ...user.brands,
                ...user.roleBasedAccess.admin.brands,
                ...user.roleBasedAccess.modifier.brands,
                ...user.roleBasedAccess.watcher.brands
            ]
            userBrands.forEach((brand, index) => {
                userBrands[index] = brand.toString();
            })
            userBrands = new Set([...userBrands])
            where = {
                ...where,
                _id: {$in: [...userBrands]}
            }
            let pagination = await getPaginations(ModelsCollections.Brand, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let brands = await Brand.find({_id: {$in: [...userBrands]}}).paginate(options);
            await getBrandUserRelation(user.id, brands)
            return {brands, pagination};
        },
        allBrands: async (_, {options}, {user, isAuth}) => {
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
                let pagination = await getPaginations(ModelsCollections.Brand, page, limit, where, sort)
                options["offset"] = pagination.offset;
                let brands = await Brand.find({}).paginate(options);
                return {brands, pagination}
            }
        },
        publishedBrands: async (_, {options}) => {
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
            let pagination = await getPaginations(ModelsCollections.Brand, page, limit, where, sort)
            options["offset"] = pagination.offset;
            return await Brand.find({}).paginate(options).published();
        },
        brandById: async (_, {id}, {user, isAuth}) => {
            let brand = await Brand.findById(id);
            if (user) {
                await getBrandUserRelation(user.id, brand)
            }
            if (brand.status === Status.PUBLISHED || brand.user || user.role === Roles.SUPER_ADMIN) {
                return brand;
            }
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided for unpublished brand")
            } else {
                return new ApolloError("Brand Not Found", '404')
            }

        },
        searchPendingBrands: async (_, {options}, {user, isAuth}) => {
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
            let pagination = await getPaginations(ModelsCollections.Brand, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let brands = await Brand.find({}).paginate(options).pending();
            await getBrandUserRelation(user.id, brands);
            return {brands, pagination};
        },
        searchBlockedBrands: async (_, {options}, {user, isAuth}) => {
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
            let pagination = await getPaginations(ModelsCollections.Brand, page, limit, where, sort)
            options["offset"] = pagination.offset;
            let brands = await Brand.find({}).paginate(options).blocked();
            await getBrandUserRelation(user.id, brands);
            return {brands, pagination};
        },
        moderatorsByBrandId: async (_, {id}, {user}) => {
            let brand = await Brand.findById(id);
            if (!brand) {
                return new ApolloError("Brand Not Found", '404')
            }
            let brandRoleBaseAccessInvite = await BrandRoleBaseAccessInvite.find({_id: {$in: brand.roleBaseAccessInvites}});
            return brandRoleBaseAccessInvite
        }

    },
    Mutation: {
        createBrand: async (_, {newBrand}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let slug = newBrand.name

                let brand = Brand({
                    ...newBrand,
                    owner: user.id,
                    publishingDateTime: dateTime()
                })
                if (newBrand.tags) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Tag, "brands", [], newBrand.tags, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Tag Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    brand.tags = newArray;
                }
                if (newBrand.category) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "brands", [], newBrand.category, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Catergory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    brand.category = newArray
                }
                if (newBrand.subCategory) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "brands", [], newBrand.subCategory, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Subcategory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    brand.subCategory = newArray
                }
                brand.slug = slug;
                let result = await brand.save();
                let userRes = await User.findById(user._id);
                userRes.brands.push(result.id);
                await userRes.save();
                return result;
            } catch (err) {
                console.log("error", e)
                return new ApolloError(err, 500)
            }
        },
        deleteBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Brand.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        editBrand: async (_, {id, newBrand}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let brand = await Brand.findById(id);
                let slug = brand.name;
                let preTags = brand.tags
                let preCategories = brand.category
                let preSubCategories = brand.subCategory
                if (newBrand.tags) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Tag, "brands", preTags, newBrand.tags, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Tag Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newBrand.tags = newArray;
                }
                if (newBrand.category) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "brands", preCategories, newBrand.category, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Catergory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newBrand.category = newArray
                }
                if (newBrand.subCategory) {
                    let {
                        status,
                        newArray,
                        newArrayData
                    } = await modelArrayManager(ModelsCollections.Category, "brands", preSubCategories, newBrand.subCategory, brand.id);
                    if (!status) {
                        return new ApolloError("Error in Subcategory Manager", '500');
                    }
                    newArrayData.forEach((arrayitem)=>{
                        slug = slug.concat(" ",arrayitem.title)
                    })
                    newBrand.subCategory = newArray
                }
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                    let notification = {
                        description: `${user.fullName} edited a Brand ${brand.name}`,
                        entity: brand.id,
                        entityType: Models.Brand,
                        link: `http://localhost:3000/brand/details/${brand.id}`,
                        messageBody: `${user.fullName} edited a Brand ${brand.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {
                    console.log(e)
                }
                newBrand.slug = slug;
                return await Brand.findOneAndUpdate({_id: id}, newBrand, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        archiveBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let brand = await Brand.findOneAndUpdate({_id: id}, {status: Status.ARCHIVED}, {new: true});
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                    let notification = {
                        description: `${user.fullName} archived a Brand ${brand.name}`,
                        entity: brand.id,
                        entityType: Models.Brand,
                        link: `http://localhost:3000/brand/details/${brand.id}`,
                        messageBody: `${user.fullName} archived a Brand ${brand.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {

                }
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        unArchiveBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let brand = await Brand.findOneAndUpdate({_id: id}, {status: Status.DRAFT}, {new: true});
                try {
                    let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                    let notification = {
                        description: `${user.fullName} unarchived a Brand ${brand.name}`,
                        entity: brand.id,
                        entityType: Models.Brand,
                        link: `http://localhost:3000/brand/details/${brand.id}`,
                        messageBody: `${user.fullName} unarchived a Brand ${brand.name}`,
                        messageTitle: `${user.fullName}`,
                        title: `${user.fullName}`,
                        sender:user.id,
                    }
                    console.log("notification 📩:", notification)
                    await createNotification(notification,notificationsUsers);
                }catch (e) {

                }
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        verifyBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let brand = await Brand.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                    if (!brand) {
                        return new ApolloError("Brand not found", '404');
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                        let notification = {
                            description: `${user.fullName} verified your Brand ${brand.name}`,
                            entity: brand.id,
                            entityType: Models.Brand,
                            link: `http://localhost:3000/brand/details/${brand.id}`,
                            messageBody: `${user.fullName} verified your Brand ${brand.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {

                    }
                    return true
                } catch (err) {
                    return new ApolloError(err, 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        blockBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let brand = await Brand.findByIdAndUpdate(id, {isBlocked: true});
                    if (!brand) {
                        return new ApolloError("Brand Not Found", '404')
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                        let notification = {
                            description: `${user.fullName} blocked your Brand ${brand.name}`,
                            entity: brand.id,
                            entityType: Models.Brand,
                            link: `http://localhost:3000/brand/details/${brand.id}`,
                            messageBody: `${user.fullName} blocked your Brand ${brand.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);

                    }catch (e) {

                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        unblockBrand: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let brand = await Brand.findByIdAndUpdate(id, {isBlocked: false});
                    if (!brand) {
                        return new ApolloError("Brand Not Found", '404')
                    }
                    try {
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                        let notification = {
                            description: `${user.fullName} unblocked your Brand ${brand.name}`,
                            entity: brand.id,
                            entityType: Models.Brand,
                            link: `http://localhost:3000/brand/details/${brand.id}`,
                            messageBody: `${user.fullName} unblocked your Brand ${brand.name}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e) {

                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        inviteBrandModerator: async (_, {id, email, role}, {user}) => {
            try {
                let brand = await Brand.findById(id);
                if (brand) {
                    await EmailRules.validate({email}, {abortEarly: false});
                    let invitedUser = await User.findOne({email: email})
                    let invited = null;
                    if (invitedUser) {
                        invited = invitedUser.id;
                        await getBrandUserRelation(invitedUser.id, brand)
                    }
                    let brandRoleBaseAccessInvite = await BrandRoleBaseAccessInvite.findOne({
                        invitedEmail: email,
                        brand: brand.id,
                        isDeleted: false,
                    })

                    if (brand.user) {
                        return new ApolloError(`User has already Joined as ${brand.user}`, 400)
                    }
                    if (brandRoleBaseAccessInvite) {
                        if (!brandRoleBaseAccessInvite.isExpired) {
                            return new ApolloError(`Already Invited as ${brandRoleBaseAccessInvite.role}`, 400)
                        }
                        brandRoleBaseAccessInvite.isDeleted = true;
                        brand.roleBaseAccessInvites = arrayRemove(brand.roleBaseAccessInvites, brandRoleBaseAccessInvite.id)
                        await brandRoleBaseAccessInvite.save()
                    }
                    brandRoleBaseAccessInvite = new BrandRoleBaseAccessInvite({
                        user: user.id,
                        invited,
                        invitedEmail: email,
                        role,
                        brand: brand.id,
                        expiresAt: Date.now() + 86400000
                    });
                    let emailLink = await emailBrandInviteUrl(brandRoleBaseAccessInvite);
                    brandRoleBaseAccessInvite.inviteLink = emailLink;
                    //TODO change emailConfirmBody()
                    try {
                        let emailHtml = await emailInviteBody(brandRoleBaseAccessInvite, emailLink);
                        await sendEmail(email, emailLink, emailHtml)
                    } catch (e) {
                        // return new ApolloError(`Email Sending Failed to ${email}`, 500);
                    }
                    try {
                        await brandRoleBaseAccessInvite.save();
                        brand.roleBaseAccessInvites.push(brandRoleBaseAccessInvite.id)
                        brand.save();
                        //TODO change redirect link for notification
                        if(invited){
                            try {
                                let notificationsUsers = [];
                                notificationsUsers.push(invitedUser)
                                let notification = {
                                    description: `${user.fullName} invited you to Brand ${brand.name}`,
                                    entity: brandRoleBaseAccessInvite.id,
                                    entityType: Models.BrandRoleBaseAccessInvite,
                                    link: `http://localhost:3000/brand/details/${brand.id}`,
                                    messageBody: `${user.fullName} invited you to Brand ${brand.name}`,
                                    messageTitle: `${user.fullName}`,
                                    title: `${user.fullName}`,
                                    sender:user.id,
                                }
                                console.log("notification 📩:", notification)
                                await createNotification(notification,notificationsUsers);
                            }catch (e) {

                            }
                        }
                        return true
                    } catch (e) {
                        console.log("Saving error:", e)
                        return new ApolloError('Saving error', 404)
                    }

                } else {
                    return new ApolloError('Brand not found', 404)
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        acceptBrandInvite: async (_, {token}, {user, isAuth}) => {
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
            let brandRoleBaseAccessInvite = await BrandRoleBaseAccessInvite.findById(decodedToken.jwtPayload.id);
            if (brandRoleBaseAccessInvite) {
                if (brandRoleBaseAccessInvite.isExpired) {
                    return new AuthenticationError("Token is Expired. Ask to invite you again.", '401');
                }
                if (brandRoleBaseAccessInvite.isAccepted) {
                    return new AuthenticationError("This invitation has been used.", '401');
                }
                if (brandRoleBaseAccessInvite.isDeleted) {
                    return new AuthenticationError("Invite has been Deleted. Ask to invite you again.", '401');
                }
                console.log("brandRoleBaseAccessInvite:", brandRoleBaseAccessInvite)
                if (user.email === decodedToken.jwtPayload.invitedEmail) {
                    let brand = await Brand.findById(brandRoleBaseAccessInvite.brand);
                    console.log("user:", user)
                    let roleBasedAccess = await RoleBaseAccess.findById(user.roleBasedAccess)
                    if (brandRoleBaseAccessInvite.role === 'ADMIN') {
                        brand.admins.push(user.id);
                        roleBasedAccess.admin.brands.push(brand.id);
                    } else if (brandRoleBaseAccessInvite.role === 'MODIFIER') {
                        brand.modifiers.push(user.id);
                        roleBasedAccess.modifier.brands.push(brand.id);

                    } else if (brandRoleBaseAccessInvite.role === 'WATCHER') {
                        brand.watchers.push(user.id);
                        roleBasedAccess.watcher.brands.push(brand.id);

                    } else {

                    }
                    brandRoleBaseAccessInvite.isAccepted = true;
                    brandRoleBaseAccessInvite.invited = user.id;
                    brandRoleBaseAccessInvite.status = Status.ACCEPTED;
                    await brand.save();
                    await brandRoleBaseAccessInvite.save();
                    await roleBasedAccess.save();
                    try{
                        let notificationsUsers = await getAllModeratorsWithNotificationToken(ModelsCollections.Brand,brand.id);
                        let notification = {
                            description: `${user.fullName} joined Brand ${brand.name} as ${brandRoleBaseAccessInvite.role}`,
                            entity: brand.id,
                            entityType: Models.Brand,
                            link: `http://localhost:3000/brand/details/${brand.id}`,
                            messageBody: `${user.fullName} joined Brand ${brand.name} as ${brandRoleBaseAccessInvite.role}`,
                            messageTitle: `${user.fullName}`,
                            title: `${user.fullName}`,
                            sender:user.id,
                        }
                        console.log("notification 📩:", notification)
                        await createNotification(notification,notificationsUsers);
                    }catch (e){
                        console.log(e)
                    }
                    return true
                } else {
                    return new AuthenticationError("Unauthorised User's token.", '401');
                }
            }

        },
        removeBrandModerator: async (_, {id, email, role}, {user}) => {
            try {
                let brand = await Brand.findById(id);
                if (user.email === email) {
                    return new AuthenticationError("Cannot remove your self.", '401');
                }
                if (brand) {
                    let brandRoleBaseAccessInvites = await BrandRoleBaseAccessInvite.find({
                        invitedEmail: email,
                        brand: brand.id,
                        isDeleted: false
                    })
                    await BrandRoleBaseAccessInvite.updateMany({
                        invitedEmail: email,
                        brand: brand.id,
                        isDeleted: false
                    }, {isDeleted: true, status: Status.DELETED})
                    brandRoleBaseAccessInvites.forEach((brandRoleBaseAccessInvite) => {
                        brand.roleBaseAccessInvites = arrayRemove(brand.roleBaseAccessInvites, brandRoleBaseAccessInvite.id)
                    })
                    await brand.save()
                    let invitedUser = await User.findOne({email})
                    if (invitedUser) {
                        if (role === Roles.ADMIN) {
                            await Brand.findOneAndUpdate({_id: id}, {$pullAll: {admins: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"admin.brands": [brand.id]}})

                        } else if (role === Roles.MODIFIER) {
                            await Brand.findOneAndUpdate({_id: id}, {$pullAll: {modifiers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"modifier.brands": [brand.id]}})

                        } else if (role === Roles.WATCHER) {
                            await Brand.findOneAndUpdate({_id: id}, {$pullAll: {watchers: [invitedUser.id]}}, {new: true});
                            await RoleBaseAccess.findOneAndUpdate({user: invitedUser.id}, {$pullAll: {"watcher.brands": [brand.id]}})
                        }

                        try{
                            let notificationsUsers = [];
                            notificationsUsers.push(invitedUser)
                            let notification = {
                                description: `${user.fullName} removed you from Brand ${brand.name}`,
                                entity: brand.id,
                                entityType: Models.Brand,
                                link: `http://localhost:3000/brand/details/${brand.id}`,
                                messageBody: `${user.fullName} removed you Brand ${brand.name}`,
                                messageTitle: `${user.fullName}`,
                                title: `${user.fullName}`,
                                sender:user.id,
                            }
                            console.log("notification 📩:", notification)
                            await createNotification(notification,notificationsUsers);
                        }catch (e){
                            console.log(e)
                        }
                    }
                    return true
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        clickBrand: async (_, {id}, {user}) => {
            try {
                let brand = Brand.findById(id)
                brand.clickCounts++
                await brand.save();
                await BrandClick.create({brand: brand.id, user: user?.id});
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        viewBrand: async (_, {id}, {user}) => {
            try {
                let brand = Brand.findById(id)
                brand.viewCounts++
                await brand.save();
                await BrandView.create({brand: brand.id, user: user?.id});
                return true
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        toggleSubscribeBrand: async (_, {id}, {user}) => {
            try {
                let brand = await Brand.findById(id)
                user = await User.findById(user.id)
                let subscription = await Subscription.findById(user.subscriptions)
                if (!subscription) {
                    subscription = new Subscription({
                        user: user.id
                    })
                    user.subscriptions = subscription.id
                    await user.save()
                }
                if (subscription.brands.includes(brand.id)) {
                    subscription.brands = arrayRemove(subscription.brands, brand.id)
                    brand.subscribers = arrayRemove(brand.subscribers, user.id)
                } else {
                    subscription.brands.push(brand.id)
                    brand.subscribers.push(user.id)
                }
                await brand.save()
                await subscription.save()
                return true
            } catch (e) {
                return new ApolloError(e, 500)
            }
        }
    },
}

module.exports = resolvers;
