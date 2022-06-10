const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userRoleBaseAccessSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    admin: {
        shops:[{
            type: Schema.Types.ObjectId,
            ref: 'shops',
        }],
        brands:[{
            type: Schema.Types.ObjectId,
            ref: 'brands',
        }],
    },
    modifier: {
        shops:[{
            type: Schema.Types.ObjectId,
            ref: 'shops',
        }],
        brands:[{
            type: Schema.Types.ObjectId,
            ref: 'brands',
        }],
    },
    watcher: {
        shops:[{
            type: Schema.Types.ObjectId,
            ref: 'shops',
        }],
        brands:[{
            type: Schema.Types.ObjectId,
            ref: 'brands',
        }],
    },

}, {
    timestamps: true
});

const UserRoleBaseAccess = mongoose.model('user_role_base_access', userRoleBaseAccessSchema);
export default UserRoleBaseAccess;

