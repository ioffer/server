const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import {Roles} from '../constants/enums'
const brandRoleBaseAccessInviteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    invited: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    invitedEmail: String,
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'brands',
    },
    role:{
        type:String,
        enum:Roles,
    },
    inviteLink: {
        type: String,
        default: null,
    },
    isAccepted: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    expiresAt: String,
}, {
    timestamps: true
});

brandRoleBaseAccessInviteSchema.set('toObject', {virtuals: true})
brandRoleBaseAccessInviteSchema.set('toJSON', {virtuals: true})
brandRoleBaseAccessInviteSchema.virtual('isExpired').get(function () {
    return this.expiresAt < Date.now()
})

const BrandRoleBaseAccessInvite = mongoose.model('brand_role_base_access_invites', brandRoleBaseAccessInviteSchema);
export default BrandRoleBaseAccessInvite;