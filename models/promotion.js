const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const promotionSchema = new Schema({
    name: String,
    images: [String],
    tags:[String],
    category: [String],
    description: String,
    price: String,
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
    hidden:{
        type:Boolean,
        default:false
    },
    archived:{
        type:Boolean,
        default:false
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
    startDate: String,
    endDate: String,
}, {
    timestamps: true
});

const Promotion = mongoose.model('promotions', promotionSchema);
export default Promotion;
