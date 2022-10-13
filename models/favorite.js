const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favoriteSchema = new Schema({
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

const Favorite = mongoose.model('favorites', favoriteSchema);
export default Favorite;

