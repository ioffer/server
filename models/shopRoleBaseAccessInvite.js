const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import {Roles} from '../constants/enums'

const shopRoleBaseAccessInviteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    invited: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    invitedEmail: String,
    shop: {
        type: Schema.Types.ObjectId,
        ref: 'shops',
    },
    role: {
        type: String,
        enum: Roles,
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
shopRoleBaseAccessInviteSchema.set('toObject', {virtuals: true})
shopRoleBaseAccessInviteSchema.set('toJSON', {virtuals: true})
shopRoleBaseAccessInviteSchema.virtual('isExpired').get(function () {
    return this.expiresAt < Date.now()
})
const ShopRoleBaseAccessInvite = mongoose.model('shop_role_base_access_invites', shopRoleBaseAccessInviteSchema);
export default ShopRoleBaseAccessInvite;

