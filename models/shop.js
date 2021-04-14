const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shopSchema = new Schema({
    name: String,
    shopCategory:[String],
    logo: String,
    tags:[String],
    website: String,
    phoneNumbers: String,
    mobileNumber: String,
    location: String,
    address: String,
    publishingDateTime:String,
    isBlocked: Boolean,
    verified: {
        type: String,
        default:"PENDING"
    },
    viewCounts: {
        type: Number,
        default:0
    },
    clickCounts: {
        type: Number,
        default:0
    },
    owner: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    moderators: [{
        ref: 'users',
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
