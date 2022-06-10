import {Status} from '../constants/enums'
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const brandSchema = new Schema({
    name: String,
    brandCategory:[{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    subCategory: [{
        ref:'categories',
        type:Schema.Types.ObjectId,
    }],
    logo: {
        type:Schema.Types.ObjectId,
        ref: 'media'
    },
    coverImage:{
        type:Schema.Types.ObjectId,
        ref: 'media'
    },
    tags:[String],
    website: String,
    phoneNumbers: String,
    mobileNumber: String,
    publishingDateTime:String,
    facebook: String,
    tiktok: String,
    twitter: String,
    instagram: String,
    youtube: String,
    linkedIn: String,
    status: {
        type:String,
        enum:Status,
    },
    isBlocked: {
        type: Boolean,
        default:false
    },
    verified: {
        type:String,
        enum:Status,
        default:Status.PENDING
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
    brandShops: [{
        ref: 'shops',
        type: Schema.Types.ObjectId
    }],
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
        ref: 'brand_role_base_access_invites',
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
    }],
}, {
    timestamps: true
});

const Brand = mongoose.model('brands', brandSchema);
export default Brand;