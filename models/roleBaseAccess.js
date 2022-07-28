const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleBaseAccessSchema = new Schema({
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

const RoleBaseAccess = mongoose.model('role_base_access', roleBaseAccessSchema);
export default RoleBaseAccess;

