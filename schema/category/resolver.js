import {Category} from "../../models";
import lodash from 'lodash';
import async from "async";
const fs = require('fs');

let fetchData = async () => {
    return await Category.find();
}

// const result = [];
function objectToArray(obj, result) {
    if (!obj) return;
    const { subCategories, ...rest } = obj;
    const rest2 = {
        ...rest,
        id:rest._id,
    }
    result.push({ ...rest2 });
    for(let i=0; i<subCategories.length; i++) {
        objectToArray(subCategories[i]._doc, result);
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
    Category: {
        parentCategory: async (parent) => {
            return await Category.findById(parent.parentCategory);
        },
        subCategories: async (parent) => {
            return await Category.find({parentCategory:parent.id})
        }
    },
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
                console.log('data',data)
                let result = [];
                objectToArray(data._doc, result);
                console.log(result);
                return result;
                console.log(result);
            } catch (e) {
                console.error('error', e)
            }
        },

    },
    Mutation: {},
}

module.exports = resolvers;
