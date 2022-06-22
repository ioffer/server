const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import {Roles} from '../constants/enums'
const brandRoleBaseAccessInviteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    invite: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'brands',
    },
    role:{
        type:String,
        enum:Roles,
    },
    inviteLink:String,
    isAccepted:Boolean,
    isExpired:Boolean,
    email: String,
}, {
    timestamps: true
});

const BrandRoleBaseAccessInvite = mongoose.model('brand_role_base_access_invites', brandRoleBaseAccessInviteSchema);
export default BrandRoleBaseAccessInvite;