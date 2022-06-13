import {Category} from "../../models";
import lodash from 'lodash';
const fs = require('fs');

let fetchData = async () => {
    return await Category.find();
}

const result = [];
function objectToArray(obj) {
    if (!obj) return;
    const { subCategories, ...rest } = obj;
    result.push({ ...rest });
    for(let i=0; i<subCategories.length; i++) {
        objectToArray(subCategories[i]._doc);
    }
}
let deepPopulate = async (populate = {}, level = null) => {
    let populateSet = {
        path: 'subCategories',
        populate: {
            path: 'subCategories'
        }
    }
    if (level > 0) {
        populate.populate = populateSet
        await deepPopulate(populate.populate, level - 1)
    }
    return populate
}

const resolvers = {
    Category: {},
    Query: {
        categories: () => {
            return fetchData()
        },
        categoryById: async (_, args) => {
            return await Category.findById(args.id);
        },
        mainCategories: async () => {
            return await Category.find({level: {'$gte': 0, '$lte': 2}});
        },
        subCategories: async (_, {id}) => {
            let populate = {
                path: 'subCategories',
                populate: {
                    path: 'subCategories'
                }
            }
            populate = await deepPopulate(populate, 2)
            try {
                let data = await Category.findById(id).populate([populate]);
                objectToArray(data._doc);
                console.log(result);
            } catch (e) {
                console.error('error', e)
            }
        },

    },
    Mutation: {},
}

module.exports = resolvers;
