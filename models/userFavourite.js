const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userFavouriteSchema = new Schema({
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
    }]
}, {
    timestamps: true
});

const UserFavourite = mongoose.model('user_favourites', userFavouriteSchema);
export default UserFavourite;

