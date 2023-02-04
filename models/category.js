const mongoose = require('mongoose')
const Schema = require('mongoose').Schema;

const categorySchema = new Schema({
    title:{
        type:String,
        unique:true,
    },
    subCategories: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    level:Number,
    parentCategory: {
        ref: 'categories',
        type: Schema.Types.ObjectId,
    },
    shops: [{
        ref: 'shops',
        type: Schema.Types.ObjectId,
    }],
    brands: [{
        ref: 'brands',
        type: Schema.Types.ObjectId,
    }],
    promotions: [{
        ref: 'promotions',
        type: Schema.Types.ObjectId,
    }],
},{
    timestamps: true
})

const Category = mongoose.model('categories', categorySchema);
module.exports = Category;
// export default Category;