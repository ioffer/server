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
    role:{
        type:String,
        enum:Roles,
    },
    inviteLink:String,
    isAccepted:Boolean,
    isExpired:Boolean,
    isDeleted:Boolean,
    expiresAt:String,
}, {
    timestamps: true
});

const ShopRoleBaseAccessInvite = mongoose.model('shop_role_base_access_invites', shopRoleBaseAccessInviteSchema);
export default ShopRoleBaseAccessInvite;

