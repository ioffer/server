import mongoose from "mongoose";
const Schema = require('mongoose').Schema;

const brandViewSchema = new Schema({
    brand:{
        ref:'brands',
        type:Schema.Types.ObjectId,
    },
    user: {
        ref: 'users',
        type: Schema.Types.ObjectId,
    },
},{
    timestamps: true
})

const BrandView = mongoose.model('brandviews', brandViewSchema);
export default BrandView;