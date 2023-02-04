const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userNotificationSchema = new Schema({
    notification: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'notifications',
        index: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'users',
        index: true
    },
    isSeen: {
        type: Boolean,
        default:false,
    },
    isDeleted: {
        type: Boolean,
        default:false,
    }
}, {
    timestamps: true
});

userNotificationSchema.query.notDeleted = function () {
    return this.where({isDeleted: false})
}
userNotificationSchema.query.search = function (filter={}) {
    return this.where(filter)
}
userNotificationSchema.query.paginate = function (options) {
    return this.where(options.where).limit(options.limit).skip(options.offset).sort(options.sort)
}

userNotificationSchema.set('toObject', {virtuals: true})
userNotificationSchema.set('toJSON', {virtuals: true})
const UserNotification = mongoose.model('user_notifications', userNotificationSchema);
export default UserNotification;