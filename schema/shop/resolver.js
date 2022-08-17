import {User, Promotion, Shop, Tag, Category, Media, Brand} from "../../models";
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

let fetchData = async () => {
    return await Shop.find({});

}

const resolvers = {
    Shop: {
        promotions: async (parent) => {
            return await Promotion.find({_id: {$in: parent.promotions}});
        },
        brand: async (parent) => {
            console.log(parent.brand)
            return await Brand.findById(parent.brand)
        },
        tags: async (parent) => {
            console.log(parent._id, 'parent.tags->', parent.tags)
            return await Tag.find({_id: {$in: parent.tags}});
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
                    await Brand.findByIdAndUpdate(newShop.brand, {$push:{brandShops:shop.id}});
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
                return new ApolloError( err, 500)
            }
        },
        editShop: async (_, {id, newShop}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
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
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    await Shop.findOneAndUpdate({_id: id}, {status: Status.DELETED}, {new: true});
                    return true
                } else {
                    console.log("here")
                    let shop = await Shop.findOneAndUpdate({
                        _id: id,
                        owner: user.id
                    }, {status: Status.DELETED}, {new: true});
                    console.log("here2", shop)
                    return true
                }
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        archiveShop: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.ARCHIVED}, {new: true});
                return true

            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        unArchiveShop: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await Shop.findOneAndUpdate({_id: id}, {status: Status.DRAFT}, {new: true});
                return true

            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        verifyShop: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if (user.type === Roles.SUPER_ADMIN) {
                try {
                    let response = await Shop.findByIdAndUpdate(id, {$set: {"verified": Verified.VERIFIED}});
                    if (!response) {
                        return new ApolloError("Shop not found", '404');
                    }
                    return true
                } catch (err) {
                    return new ApolloError( err, 500)
                }
            } else {
                throw new AuthenticationError("Unauthorised User", '401');
            }
        },
        blockShop: async (_, {id}, {user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                if (user.type === Roles.SUPER_ADMIN) {
                    let blockingShop = await Shop.findById(id);
                    let response = await Shop.findByIdAndUpdate(id, {isBlocked: true});
                    if (!response) {
                        return new ApolloError("Shop Not Found", '404')
                    }
                    return true;
                }
            } catch (err) {
                return new ApolloError( err, 500)
            }
        },
        inviteShopModerator: async (_, {id, email, role}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let shop = await Shop.findOne({_id: id, owner: user.id});
                if (shop) {
                    for (email of emails) {
                        await EmailRules.validate({email}, {abortEarly: false});
                        let emailLink = await emailConfirmationUrl(email);
                        //TODO change emailConfirmBody()
                        let emailHtml = await emailConfirmationBody(user.fullName, emailLink);
                        try {
                            await sendEmail(email, emailLink, emailHtml)
                        } catch (e) {
                            return new ApolloError(`Email Sending Failed to ${email}`, 500);
                        }
                    }
                }
            } catch (err) {
                return new ApolloError( err, 500)
            }
        },
        removeShopModerator: async (_, {id, email, role}, {Shop, user}) => {
            if (!user) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                return await Shop.findOneAndUpdate({_id: id}, {$push: {moderators: userID}}, {new: true});
            } catch (err) {
                return new ApolloError( err, 500)
            }
        },
        clickShop: async (_, {id}) => {
            try {
                await Shop.findByIdAndUpdate(id, {$inc: {clickCounts: 1}});
                return true
            } catch (err) {
                return new ApolloError( err, 500)
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

module.exports = resolvers;
