import {Status, Verified} from "../constants/enums";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shopSchema = new Schema({
    name: String,
    category:[{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    subCategory: [{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    logo: {
        type:Schema.Types.ObjectId,
        ref: 'medias'
    },
    coverImage:{
        type:Schema.Types.ObjectId,
        ref: 'medias'
    },
    tags:[{
        type:Schema.Types.ObjectId,
        ref: 'tags'
    }],
    website: String,
    email: String,
    phoneNumbers: String,
    mobileNumber: String,
    location: String,
    address: String,
    publishingDateTime:String,
    facebook: String,
    tiktok: String,
    twitter: String,
    instagram: String,
    youtube: String,
    linkedIn: String,
    isBlocked: {
        type: Boolean,
        default:false
    },
    status: {
        type:String,
        enum:Status,
    },
    verified: {
        type:String,
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
    subscriberCounts: {
        type: Number,
        default:0
    },
    owner: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    brand: {
        ref: 'brands',
        type: Schema.Types.ObjectId
    },
    admins: [{
        ref: 'users',
        type: Schema.Types.ObjectId
    }],
    modifiers: [{
        ref: 'users',
        type: Schema.Types.ObjectId
    }],
    watchers: [{
        ref: 'users',
        type: Schema.Types.ObjectId
    }],
    subscribers: [{
        ref: 'users',
        type: Schema.Types.ObjectId
    }],
    roleBasedAccessInvites: [{
        ref: 'shop_role_base_access_invites',
        type: Schema.Types.ObjectId
    }],
    verifiedBy: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    promotions: [{
        ref: 'promotions',
        type: Schema.Types.ObjectId
    }],
    offers: [{
        ref: 'offers',
        type: Schema.Types.ObjectId
    }]
}, {
    timestamps: true
});

const Shop = mongoose.model('shops', shopSchema);
export default Shop;
