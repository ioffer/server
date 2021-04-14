const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let offerSchema = new Schema({
    name: String,
    image: String,
    tags:[String],
    category: [String],
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


const Offer = mongoose.model('offers', offerSchema);
export default Offer;
