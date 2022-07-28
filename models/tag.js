const mongoose = require('mongoose')
const Schema = require('mongoose').Schema;

const tagSchema = new Schema({
    title:{
        type:String,
        unique:true,
    },
    shops: [{
        ref: 'shops',
        type: Schema.Types.ObjectId,
    }],
    brands: [{
        ref: 'brands',
        type: Schema.Types.ObjectId,
    }],
},{
    timestamps: true
})

const Tag = mongoose.model('tags', tagSchema);
module.exports = Tag;
// export default Category;