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
            let brand =  await Brand.findById(parent.brand)
            console.log("😂brand:", brand)
            return brand
        },
    },
    Query: {

    },
    Mutation: {

    },
}

module.exports = resolvers;
