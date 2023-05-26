import {Status, Verified} from "../constants/enums";
import {error} from "logrocket";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function getSlug(slug) {
    return slug;
}
function setSlug(slug) {
    return slug
}

const shopSchema = new Schema({
    name: String,
    category: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    subCategory: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    logo: {
        type: Schema.Types.ObjectId,
        ref: 'medias'
    },
    coverImage: {
        type: Schema.Types.ObjectId,
        ref: 'medias'
    },
    tags: [{
        type: Schema.Types.ObjectId,
        ref: 'tags'
    }],
    website: String,
    slug: {
        type: String,
        default: "",
        get: getSlug,
        set: setSlug
    },
    email: String,
    phoneNumber: String,
    mobileNumber: String,
    location: String,
    address: String,
    city: String,
    publishingDateTime: String,
    facebook: String,
    tiktok: String,
    twitter: String,
    instagram: String,
    youtube: String,
    linkedIn: String,
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: Status,
        default: Status.DRAFT
    },
    verified: {
        type: String,
        enum: Verified,
        default: Verified.PENDING
    },
    viewCounts: {
        type: Number,
        default: 0
    },
    clickCounts: {
        type: Number,
        default: 0
    },
    subscriberCounts: {
        type: Number,
        default: 0
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
    roleBaseAccessInvites: [{
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

shopSchema.methods.getRelation = function (userId) {
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


shopSchema.query.byName = function (name) {
    return this.where({name: new RegExp(name, 'i')})
}
shopSchema.query.search = function (filter={}) {
    return this.where(filter)
}
shopSchema.query.paginate = function (options) {
    return this.where(options.where).limit(options.limit).skip(options.offset).sort(options.sort)
}
shopSchema.query.byEmail = function (email) {
    return this.where({email: new RegExp(email, 'i')})
}
shopSchema.query.published = function () {
    return this.where({status: Status.PUBLISHED})
}
shopSchema.query.pending = function () {
    return this.where({verified: Verified.PENDING})
}
shopSchema.query.blocked = function () {
    return this.where({isBlocked: true})
}

shopSchema.query.notDeleted = function () {
    return this.where({status: {$not: Status.DELETED}})
}

shopSchema.set('toObject', {virtuals: true})
shopSchema.set('toJSON', {virtuals: true})
const Shop = mongoose.model('shops', shopSchema);
export default Shop;
