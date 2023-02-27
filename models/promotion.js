import {Status, Verified} from "../constants/enums";
import Brand from "./brand";
import Shop from "./shop";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function getStatus(status) {
    let endDate = null, startDate = null;
    if(this.endDate) {
         endDate = new Date(this.endDate)
    }
    if(this.startDate) {
        startDate = new Date(this.startDate)
    }
    let date = new Date()
    console.log('date🔥:',date, this.endDate, endDate)
    if (endDate && endDate <= date && status===Status.PUBLISHED) {
        return Status.EXPIRED
    } else {
        if (this.isUpcoming && (status === Status.UPCOMING || status === Status.PUBLISHED)) {
            if (startDate <= date && endDate >= date) {
                return Status.PUBLISHED
            } else if (endDate <= date) {
                return Status.EXPIRED
            } else {
                return Status.UPCOMING
            }
        }
        return status;
    }
}

function setStatus(status) {
    let endDate = null, startDate = null;
    if(this.endDate) {
        endDate = new Date(this.endDate)
    }
    if(this.startDate) {
        startDate = new Date(this.startDate)
    }
    let date = new Date()
    if (endDate && endDate <= date && status===Status.PUBLISHED) {
        return Status.EXPIRED
    } else {
        if (this.isUpcoming && (status === Status.UPCOMING || status === Status.PUBLISHED)) {
            if (startDate <= date && endDate >= date) {
                return Status.PUBLISHED
            } else if (endDate <= date) {
                return Status.EXPIRED
            } else {
                return Status.UPCOMING
            }
        }
        return status;
    }
}

const promotionSchema = new Schema({
    name: String,
    media: [{
        ref: 'medias',
        type: Schema.Types.ObjectId
    }],
    tags: [String],
    category: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    subCategory: [{
        ref: 'categories',
        type: Schema.Types.ObjectId,
    }],
    description: String,
    price: String,
    publishingDateTime: String,
    verified: {
        type: String,
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
    isUpcoming: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: Status,
        default: Status.DRAFT,
        get: getStatus,
        set: setStatus
    },
    publisher: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    verifiedBy: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    shops: [{
        ref: 'shops',
        type: Schema.Types.ObjectId
    }],
    brand: {
        ref: 'brands',
        type: Schema.Types.ObjectId
    },
    startDate: String,
    endDate: String,
}, {
    timestamps: true
});


promotionSchema.query.notDeleted = function () {
    return this.where({status: {$ne: Status.DELETED}})
}

promotionSchema.query.paginate = function (options) {
    return this.where(options.where).limit(options.limit).skip(options.offset).sort(options.sort)
}
promotionSchema.query.published = function () {
    return this.where({status: Status.PUBLISHED})
}

promotionSchema.methods.getRelation = async function (userId) {
    let userRelation = await this.getBrandRelation(userId)
    if (!userRelation) {
        userRelation = await this.getShopsRelation(userId)
    }
    return userRelation

}

promotionSchema.methods.getBrandRelation = async function (userId) {
    if (this.brand) {
        let brand = await Brand.findById(this.brand);
        if (userId.toString() === brand.owner.toString()) {
            return "OWNER"
        } else if (brand.admins.includes(userId)) {
            return "ADMIN"
        } else if (brand.modifiers.includes(userId)) {
            return "MODIFIER"
        } else if (brand.watchers.includes(userId)) {
            return "WATCHER"
        } else {
            return null
        }
    }
}
promotionSchema.methods.getShopsRelation = async function (userId) {
    let shops = await Shop.find({_id: {$in: this.shops}})
    let rolesInShops = new Set(['OWNER', 'ADMIN', 'MODIFIER', 'WATCHER'])
    if (shops.length > 0) {
        shops.forEach((shop) => {
            if (shop.owner.toString() !== userId) {
                rolesInShops.delete('OWNER')
            }
        })
        if (rolesInShops.has('OWNER')) {
            return "OWNER"
        } else {
            shops.forEach((shop) => {
                if (!shop.admins.includes(userId)) {
                    rolesInShops.delete('ADMIN')
                }
                if (!shop.modifiers.includes(userId)) {
                    rolesInShops.delete('MODIFIER')
                }
                if (!shop.watchers.includes(userId)) {
                    rolesInShops.delete('WATCHER')
                }
            })
            if (rolesInShops.has('ADMIN')) {
                return "ADMIN"
            }
            if (rolesInShops.has('MODIFIER')) {
                return "MODIFIER"
            }
            if (rolesInShops.has('WATCHER')) {
                return "WATCHER"
            }
            return null

        }
    }
}


promotionSchema.set('toObject', {virtuals: true})
promotionSchema.set('toJSON', {virtuals: true})

const Promotion = mongoose.model('promotions', promotionSchema);
export default Promotion;
