const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import {Roles, Status} from '../constants/enums'

function getStatus(status) {
    if (this.isExpired && status === Status.PENDING) {
        return Status.EXPIRED;
    } else {
        return status;
    }
}
function setStatus(status) {
    if (this.isExpired && status === Status.PENDING) {
        return Status.EXPIRED;
    } else {
        return status;
    }
}

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
    status: {
        type: String,
        enum: Status,
        default: Status.PENDING,
        get: getStatus,
        set:setStatus
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
shopRoleBaseAccessInviteSchema.set('toObject', {virtuals: true, getters: true})
shopRoleBaseAccessInviteSchema.set('toJSON', {virtuals: true, getters: true})
shopRoleBaseAccessInviteSchema.virtual('isExpired').get(function () {
    return this.expiresAt < Date.now()
})
const ShopRoleBaseAccessInvite = mongoose.model('shop_role_base_access_invites', shopRoleBaseAccessInviteSchema);
export default ShopRoleBaseAccessInvite;

