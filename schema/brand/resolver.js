import {User, Promotion, Shop, Brand, Media, Tag, BrandView, BrandClick, Category} from "../../models";
import {ApolloError, AuthenticationError} from 'apollo-server-express';
import dateTime from '../../helpers/DateTimefunctions'
import {sendEmail} from "../../utils/sendEmail";
import {emailConfirmationUrl, emailConfirmationBody} from "../../utils/emailConfirmationUrl";
import {Roles, Verified, Status} from "../../constants/enums";
import BrandRoleBaseAccessInvite from "../../models/brandRoleBaseAccessInvite";
import {EmailRules} from "../../validations";
import RoleBaseAccess from "../../models/roleBaseAccess";


let fetchData = async () => {
    return await Brand.find();
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
            return await Promotion.find({"shop": parent.id})
        },
        category: async(parent) => {
            return await Category.find({_id: {$in:parent.category}});
        },
        subCategory: async(parent) => {
            return await Category.find({_id: {$in:parent.subCategory}});
        },
        tags: async(parent) => {
            console.log(parent._id,'parent.tags->', parent.tags)
            return await Tag.find({_id: {$in:parent.tags}});
        }

    },
    Query: {
        brands: (offset) => {
            return fetchData()
        },
        brandById: async (_, args) => {
            return await Brand.findById(args.id);
        },
        searchPendingBrands: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                return await Brand.find({'verified': Verified.PENDING});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        searchBlockedShops: async (_, {}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                return await Brand.find({"isBlocked": true});
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
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
            console.log("user: " + user )
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
                        if(tags[i]!==""){
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
            } catch (e) {
                console.log("error", e)
                throw new ApolloError("Internal Server Error", 500)
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
                throw new ApolloError("Internal Server Error", '500');
            }
        },
        deleteBrand: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    await Brand.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                    return true
                } else {
                    let brand = await Brand.findOneAndUpdate({_id: id, owner: user.id}, {status: Status.DELETED}, {new: true});
                    return true
                }
            } catch (e) {
                throw new ApolloError("Internal Server Error", '500');
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
                    throw new ApolloError("Internal Server Error", '500')
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
            } catch (e) {
                throw new ApolloError("Internal Server Error", 500)
            }
        },
        inviteBrandModerator: async (_, {id, email, role}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let brand = await Brand.findOne({_id: id, owner: user.id});
                if (brand) {
                    let invite = await User.findOne({"email": email})
                    let inviteId = null;
                    if (user) {
                        inviteId = invite.id;
                    }

                    let code = (Math.random() + 1).toString(36).substring(2);
                    let inviteLink = 'brand_' + code;
                    let brandRoleBaseAccessInvite = await BrandRoleBaseAccessInvite.findOne({email, "brand": brand.id});
                    if (brandRoleBaseAccessInvite) {
                        return new ApolloError("Already Invited", 500)
                    }
                    brandRoleBaseAccessInvite = new BrandRoleBaseAccessInvite({
                        user: user.id,
                        email,
                        invite: inviteId,
                        brand: brand.id,
                        role,
                        inviteLink,
                    })
                    await brandRoleBaseAccessInvite.save()
                    // sending email
                    await EmailRules.validate({email}, {abortEarly: false});
                    await emailConfirmationUrl(email);
                    //TODO change emailConfirmBody()
                    let emailHtml = await emailConfirmationBody(user.fullName, emailLink);
                    try {
                        await sendEmail(email, emailLink, emailHtml)
                    } catch (e) {
                        return new ApolloError(`Email Sending Failed to ${email}`, 500);
                    }
                    return true;
                }
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        removeBrandModerator: async (_, {id, email, role}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let brand = await Brand.findById(id);
                if (brand.owner === id || brand.admins.include(id)) {
                    let moderator = await User.findOne({email});
                    await BrandRoleBaseAccessInvite.findOneAndRemove({email, "brand": brand.id});
                    //TODO also remove from user role access
                    if (role === 'ADMIN') {
                        const index = brand.admins.indexOf(moderator);
                        if (index > -1) {
                            brand.admins.splice(index, 1);
                        }
                        await RoleBaseAccess.findOneAndUpdate({'_id': moderator.id},
                            {
                                admin: {
                                    $pullAll: {
                                        brands: brand.id,
                                    },
                                }
                            }
                        )

                    } else if (role === 'MODIFIER') {
                        const index = brand.modifiers.indexOf(moderator);
                        if (index > -1) {
                            brand.modifiers.splice(index, 1);
                        }
                    } else if (role === 'WATCHER') {
                        const index = brand.watchers.indexOf(moderator);
                        if (index > -1) {
                            brand.watchers.splice(index, 1);
                        }
                    } else {
                        return new ApolloError("Invalid Role", 404)
                    }

                }
                return await Shop.findOneAndUpdate({_id: id}, {$push: {moderators: userID}}, {new: true});
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        clickBrand: async (_, {id},{user}) => {
            try {
                let brand = Brand.findById(id)
                brand.clickCounts++
                await brand.save();
                await BrandClick.create({brand:brand.id, user:user?.id});
                return true
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        viewBrand: async (_, {id}, {user})=> {
            try {
                let brand = Brand.findById(id)
                brand.viewCounts++
                await brand.save();
                await BrandView.create({brand:brand.id, user:user?.id});
                return true
            } catch (e) {
                return new ApolloError("Internal Server Error", 500)
            }
        },
        // subscribeBrand: async (_,{})=>{
        //
        // }
    },
}

module.exports = resolvers;
