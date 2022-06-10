import mongoose from "mongoose";
const Schema = require('mongoose').Schema;

const shopClickSchema = new Schema({
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

const ShopClick = mongoose.model('shop_clicks', shopClickSchema);
export default ShopClick;