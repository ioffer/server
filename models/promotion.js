const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const promotionSchema = new Schema({
    name: String,
    images: [String],
    tags:[String],
    category: [String],
    description: String,
    price: Number,
    publishingDateTime:String,
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
    hidden:Boolean,
    archived:Boolean,
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
    startDate: Date,
    endDate: Date,
}, {
    timestamps: true
});

const Promotion = mongoose.model('promotions', promotionSchema);
export default Promotion;
