import mongoose from "mongoose";
const Schema = require('mongoose').Schema;

const brandClickSchema = new Schema({
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

const BrandClick = mongoose.model('brand_clicks', brandClickSchema);
export default BrandClick;