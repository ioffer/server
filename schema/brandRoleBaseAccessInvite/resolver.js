import {User, Brand} from "../../models";


const resolvers = {
    BrandRoleBaseAccessInvite: {
        user: async (parent) => {
            return await User.findById(parent.user)
        },
        invited: async (parent) => {
            return await User.findById(parent.invited)
        },
        brand: async (parent) => {
            return await Brand.findById(parent.brand)
        },
    },
    Query: {

    },
    Mutation: {

    },
}

module.exports = resolvers;
