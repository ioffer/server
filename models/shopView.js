import mongoose from "mongoose";
const Schema = require('mongoose').Schema;

const shopViewSchema = new Schema({
    shop:{
        ref:'shops',
        type:Schema.Types.ObjectId,
    },
    user: {
        ref: 'users',
        type: Schema.Types.ObjectId,
    },
},{
    timestamps: true
})

const ShopView = mongoose.model('shop_views', shopViewSchema);
export default ShopView;