import {Status, Verified} from "../constants/enums";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let offerSchema = new Schema({
    name: String,
    media: {
        ref: 'medias',
        type: Schema.Types.ObjectId
    },
    tags:[String],
    Category:[{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    subCategories:[{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    description: String,
    price: String,
    publishingDateTime:String,
    verified: {
        type: String,
        enum:Verified,
        default:Verified.PENDING
    },
    viewCounts: {
        type: Number,
        default:0
    },
    clickCounts: {
        type: Number,
        default:0
    },
    //hidden replaced by upcoming
    isUpcoming:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:Status,
        default:Status.DRAFT
    },
    publisher: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    verifiedBy: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    shop:{
        ref: 'shops',
        type: Schema.Types.ObjectId
    },
    brand:{
        ref: 'brands',
        type: Schema.Types.ObjectId
    },
    startDate: String,
    endDate: String,
}, {
    timestamps: true
});


const Offer = mongoose.model('offers', offerSchema);
export default Offer;
