import {Status, Verified} from '../constants/enums'
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const brandSchema = new Schema({
    name: String,
    email: String,
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
    tags:[String],
    website: String,
    phoneNumber: String,
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
        default:Status.DRAFT
    },
    isBlocked: {
        type: Boolean,
        default:false
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
    roleBaseAccessInvites: [{
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

brandSchema.methods.getRelation = function (userId) {
    console.log("userId === this.owner", userId, "===", this.owner)
    if (userId.toString() === this.owner.toString()) {
        return "OWNER"
    } else if (this.admins.includes(userId)) {
        return "ADMIN"
    } else if (this.modifiers.includes(userId)) {
        return "MODIFIER"
    } else if (this.watchers.includes(userId)) {
        return "WATCHER"
    } else {
        return null
    }
}

brandSchema.query.byName = function (name) {
    return this.where({name: new RegExp(name, 'i')})
}
brandSchema.query.byEmail = function (email) {
    return this.where({email: new RegExp(email, 'i')})
}
brandSchema.query.published = function () {
    return this.where({status: Status.PUBLISHED})
}
brandSchema.query.pending = function () {
    return this.where({verified: Verified.PENDING})
}
brandSchema.query.blocked = function () {
    return this.where({isBlocked: true})
}

brandSchema.set('toObject', {virtuals: true})
brandSchema.set('toJSON', {virtuals: true})
const Brand = mongoose.model('brands', brandSchema);
export default Brand;
