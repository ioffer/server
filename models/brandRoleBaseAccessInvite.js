const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import {Roles, Status, Verified} from '../constants/enums'

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

brandRoleBaseAccessInviteSchema.set('toObject', {virtuals: true, getters: true})
brandRoleBaseAccessInviteSchema.set('toJSON', {virtuals: true, getters: true})
brandRoleBaseAccessInviteSchema.virtual('isExpired').get(function () {
    return this.expiresAt < Date.now()
})

const BrandRoleBaseAccessInvite = mongoose.model('brand_role_base_access_invites', brandRoleBaseAccessInviteSchema);
export default BrandRoleBaseAccessInvite;