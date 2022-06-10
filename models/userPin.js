const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userPinSchema = new Schema({
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
    promotions:[{
        type: Schema.Types.ObjectId,
        ref: 'promotions',
    }],
    offers:[{
        type: Schema.Types.ObjectId,
        ref: 'offers',
    }]
}, {
    timestamps: true
});

const UserPin = mongoose.model('user_pins', userPinSchema);
export default UserPin;

