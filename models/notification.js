import {Models, Status} from "../constants/enums";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    title: String,
    description: String,
    messageTitle: String,
    messageBody: String,
    sender: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    entityType: {
        type: String,
        required: true,
        enum: Models,
    },
    entity: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'entityType',
    },
    link:String,
}, {
    timestamps: true
});

notificationSchema.set('toObject', {virtuals: true})
notificationSchema.set('toJSON', {virtuals: true})
const Notification = mongoose.model('notifications', notificationSchema);
export default Notification;
