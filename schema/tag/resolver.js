import {Tag, Shop} from "../../models";
import {AuthenticationError} from "apollo-server-express";

const fs = require('fs');

let fetchData = async () => {
    return await Tag.find();
}

const resolvers = {
    Tag: {
        shops: async (parent) => {
            return await Shop.find({_id: {$in:parent.shops}});
        },
        brands: async (parent) => {
            return await Brand.find({_id: {$in:parent.brands}});
        }
    },
    Query: {
        tags: () => {
            return fetchData()
        },
        tagById: async (_, args) => {
            return await Tag.findById(args.id);
        },
        tagByTitle: async (_, {title}) => {
            return await Tag.findOne({title});
        },

    },
    Mutation: {
        createTag: async (_, {title},{user}) => {
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            let tag = await Tag.findOne({title});
            if(tag){
                return tag;
            }else{
                return await Tag.create({title})
            }

        }
    },
}

module.exports = resolvers;
