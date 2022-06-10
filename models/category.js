import mongoose from "mongoose";
const Schema = require('mongoose').Schema;

const categorySchema = new Schema({
    title:{
        type:String,
    },
    subCategories: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    parentCategory: {
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }
},{
    timestamps: true
})

const Category = mongoose.model('categories', categorySchema);
export default Category;