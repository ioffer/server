import {User, Shop} from "../../models";


const resolvers = {
    ShopRoleBaseAccessInvite: {
        user: async (parent) => {
            return await User.findById(parent.user)
        },
        invited: async (parent) => {
            return await User.findById(parent.invited)
        },
        shop: async (parent) => {
            return await Shop.findById(parent.shop)
        },
    },
    Query: {

    },
    Mutation: {

    },
}

module.exports = resolvers;
