import {User, Promotion, Shop, Brand, Media, Tag, BrandView, BrandClick, Category} from "../../models";
import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {
    emailBrandInviteUrl,
    emailInviteBody
} from "../../utils/emailConfirmationUrl";
import {Roles, Verified, Status} from "../../constants/enums";
import BrandRoleBaseAccessInvite from "../../models/brandRoleBaseAccessInvite";
import {EmailRules} from "../../validations";
import RoleBaseAccess from "../../models/roleBaseAccess";
import brand from "../../models/brand";
import Subscription from "../../models/subscription";
import {verify} from "jsonwebtoken";
import {SECRET} from "../../config";


let fetchData = async () => {
    return await Brand.find({});
}

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
        brandShops: async (parent) => {
            return await Shop.find({_id: {$in: parent.brandShops}});
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
        brands: async (_, {offset}, {user}) => {
            let brands = await fetchData();
            await getBrandUserRelation(user.id, brands)
            return brands;
        },
        publishedBrands: async (offset) => {
            let brands = await Brand.find({}).published();
            await getBrandUserRelation(user.id, brands);
            return brands;
        },
        brandById: async (_, {id}, {user}) => {
            let brand = await Brand.findById(id);
            await getBrandUserRelation(user.id, brand)
            return brand;
        },
        searchPendingBrands: async (_, {}, {user}) => {
            let brands = await Brand.find({}).pending();
            await getBrandUserRelation(user.id, brands);
            return brands;
        },
        searchBlockedBrands: async (_, {}, {user}) => {
            let brands = await Brand.find({}).blocked();
            await getBrandUserRelation(user.id, brands);
            return brands;
        },
        // searchShops: async (_, {query}, {Shop}) => {
        //
        // }

    },
    Mutation: {
        createBrand: async (_, {newBrand}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            console.log("user: " + user)
            try {
                let tags = [];
                if (newBrand.tags) {
                    tags = [...new Set(newBrand.tags)];
                }
                let brand = Brand({
                    ...newBrand,
                    tags,
                    owner: user.id,
                    publishingDateTime: dateTime()
                })
                console.log("brand", brand);
                if (tags) {
                    for (let i = 0; i < tags.length; i++) {
                        if (tags[i] !== "") {
                            let tag = await Tag.findById(tags[i]);
                            if (!tag.brands.includes(brand.id)) {
                                tag.brands.push(brand.id);
                                let tagData = await tag.save();
                                console.log("tagData", tagData);
                            }
                        }
                    }
                }
                let result = await brand.save();
                console.log("result", result);
                console.log("user3", user);
                let userRes = await User.findById(user._id);
                console.log('response:', userRes)
                userRes.brands.push(result.id);
                console.log('response2:', userRes)
                await userRes.save();
                return result;
            } catch (err) {
                console.log("error", e)
                return new ApolloError(err, 500)
            }
        },
        editBrand: async (_, {id, newBrand}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (newBrand.tags) {
                    let tagsSet = new Set(newBrand.tags);
                    tagsSet.delete('')
                    newBrand.tags = [...tagsSet];
                }
                console.log("newBrand", newBrand)
                return await Brand.findOneAndUpdate({_id: id}, newBrand, {new: true});
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        deleteBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Brand.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        archiveBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Brand.findOneAndUpdate({_id: id}, {status: Status.ARCHIVED}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        unArchiveBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Brand.findOneAndUpdate({_id: id}, {status: Status.DRAFT}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        verifyBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let response = await Brand.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                    if (!response) {
                        return new ApolloError("Brand not found", '404');
                    }
                    return true
                } catch (err) {
                    return new ApolloError(err, 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        blockBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let blockingShop = await Brand.findById(id);
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: true});

                    if (!response) {
                        return new ApolloError("Brand Not Found", '404')
                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        inviteBrandModerator:async (_, {id, email, role}, {user}) => {
            try {
                let brand = await Brand.findById(id);
                if (brand) {
                    await EmailRules.validate({email}, {abortEarly: false});
                    let invitedUser = await User.findOne({email: email})
                    let invited = null;
                    if (invitedUser) {
                        invited = invitedUser.id;
                        console.log('invited:', invited)
                        await getBrandUserRelation(invitedUser.id, brand)
                        console.log('brand:', brand.user)
                    }
                    let brandRoleBaseAccessInvite = await BrandRoleBaseAccessInvite.findOne({
                        invitedEmail: email,
                        brand:brand.id,
                        isDeleted: false,
                    })

                    if (brand.user) {
                        return new ApolloError(`User has already Joined as ${brand.user}`, 400)
                    }
                    if (brandRoleBaseAccessInvite) {
                        console.log("brandRoleBaseAccessInvite:", brandRoleBaseAccessInvite)
                        if (brandRoleBaseAccessInvite.isExpired) {
                            brandRoleBaseAccessInvite.isExpired = true;
                        } else {
                            return new ApolloError(`Already Invited as ${brandRoleBaseAccessInvite.role}`, 400)
                        }
                        brandRoleBaseAccessInvite.isDeleted = true;
                        brand.roleBasedAccessInvites = arrayRemove(brand.roleBasedAccessInvites, brandRoleBaseAccessInvite.id)
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
                        return new ApolloError(`Email Sending Failed to ${email}`, 500);
                    }
                    await brandRoleBaseAccessInvite.save();
                    brand.roleBasedAccessInvites.push(brandRoleBaseAccessInvite.id)
                    brand.save();
                    return true
                } else {
                    return new ApolloError('Brand not found', 404)
                }
            } catch (err) {
                return new ApolloError(err, 500)
            }
        },
        acceptBrandInvite: async (_, {token}, {user}) => {
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
                    brandRoleBaseAccessInvite.isDeleted = true;
                    await brand.save();
                    await brandRoleBaseAccessInvite.save();
                    await roleBasedAccess.save();
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
                    }, {isDeleted: true})
                    await BrandRoleBaseAccessInvite.updateMany({
                        invitedEmail: email,
                        brand: brand.id,
                        isDeleted: false
                    }, {isDeleted: true})
                    brandRoleBaseAccessInvites.forEach((brandRoleBaseAccessInvite) => {
                        brand.roleBasedAccessInvites = arrayRemove(brand.roleBasedAccessInvites, brandRoleBaseAccessInvite.id)
                    })
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

function arrayRemove(arr, value) {

    return arr.filter(function (ele) {
        return ele != value;
    });
}

async function getBrandUserRelation(userId, brands = null) {
    if (brands) {
        console.log("userId:", userId)
        if (Array.isArray(brands)) {
            for (const brand of brands) {
                const i = brands.indexOf(brand);
                let relation = await brand.getRelation(userId)
                brands[i]._doc.user = relation;
                brands[i].user = relation;
            }
        } else {
            let relation = await brands.getRelation(userId)
            brands._doc.user = relation;
            brands.user = relation;
        }
    }
}

module.exports = resolvers;
