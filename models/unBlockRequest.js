const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const unBlockRequestSchema = new Schema({
    user: {
        ref: 'users',
        type: Schema.Types.ObjectId
    },
    description: {
        type: String,
        default: ''
    },
    unBlocked:{
        type: Boolean,
        default:false
    },
}, {
    timestamps: true
});


const UnBlockRequest = mongoose.model('unblock_requests', unBlockRequestSchema);

export default UnBlockRequest;
