import mongoose from "mongoose";
import {MediaTypes} from "../constants/enums";
const Schema = require('mongoose').Schema;

const mediaSchema = new Schema({
    url:[String],
    mediaType: {
        type: String,
        enum : MediaTypes,
    },
    uploadedBy:{
        ref: 'users',
        type:Schema.Types.ObjectId,
    }
},{
    timestamps: true
})

const Media = mongoose.model('media', mediaSchema);
export default Media;