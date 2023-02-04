import {Notification, UserNotification, User} from "../models";
import {sendPushNotification} from "../utils/firebase-admin";
import mongoose from "mongoose";

export const createNotification = async (data, receivers = [], isPushNotification = true) => {
    try {
        let notification = new Notification({...data});
        console.log("notification2 📩:", notification)
        let userNotificationsArray = []
        let receiverNotificationTokens = []
        receivers.forEach((receiver) => {
            userNotificationsArray.push({notification: notification.id, user: receiver.id})
            receiverNotificationTokens.push(receiver.notificationToken)
        })
        if (userNotificationsArray.length > 0) {
            let userNotifications = await UserNotification.insertMany(userNotificationsArray);
            console.log("userNotifications:", userNotifications)
        }
        receiverNotificationTokens = receiverNotificationTokens.filter(x => x)
        console.log("userNotificationsArray:", userNotificationsArray)
        console.log("receiverNotificationTokens:", receiverNotificationTokens)
        if (isPushNotification && receiverNotificationTokens.length > 0) {
            console.log("sending Push notifications🚀")
            const message = {
                notification: {
                    title: notification.messageTitle,
                    body: notification.messageBody,
                },
            };
            sendPushNotification(receiverNotificationTokens, message)
        }
        await notification.save()
        return true
    } catch (e) {
        console.log("error: " + e)
        return false
    }
}
export const getAllUsersWithNotificationToken = async () => {
    return await User.find({hasNotificationToken: true}).select('notificationToken');
}
export const getAllModeratorsWithNotificationToken = async (Model, modelId) => {
    let modelData = await mongoose.model(Model).findById(modelId);
    let moderators = [
        modelData.owner,
        ...modelData.admins,
        ...modelData.modifiers,
        ...modelData.watchers,
    ]
    return await User.find({_id: {$in: moderators},hasNotificationToken: true}).select('notificationToken');
}
