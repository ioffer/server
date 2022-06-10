import mongoose from "mongoose";
import {LinkTypes, SocialLinkTitles} from "../constants/enums";
const Schema = require('mongoose').Schema;

const linkSchema = new Schema({
    url:[String],
    title:{
        type:String,
        enum:SocialLinkTitles,
        default:"",
    },
    linkType: {
        type: String,
        enum : LinkTypes,
        default: LinkTypes.SOCIAL
    },
},{
    timestamps: true
})

const Link = mongoose.model('links', linkSchema);
export default Link;