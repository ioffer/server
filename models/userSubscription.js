const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSubscriptionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    shops:[{
        type: Schema.Types.ObjectId,
        ref: 'shops',
    }],
    brands:[{
        type: Schema.Types.ObjectId,
        ref: 'brands',
    }],
}, {
    timestamps: true
});

const UserSubscription = mongoose.model('user_subscriptions', userSubscriptionSchema);
export default UserSubscription;

