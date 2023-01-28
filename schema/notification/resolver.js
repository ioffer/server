import {ModelsCollections} from "../../constants/enums";

const mongoose = require('mongoose');
import {User, Notification, UserNotification} from "../../models";
import {ApolloError, AuthenticationError} from 'apollo-server-express';
import {createNotification} from "../../helpers/handleNotification";


const resolvers = {
    Notification: {
        entityData: async (parent) => {
            let entityData = await mongoose.model(ModelsCollections[parent.entityType]).findById(parent.entity)
            console.log("entityData:", entityData)
            entityData.__typename = parent.entityType
            return entityData
        },
        sender: async (parent) => {
            return await User.findById(parent.sender);
        },
    },
    UserNotification: {
        notification: async (parent) => {
            return await Notification.findById(parent.notification);
        },
        user: async (parent) => {
            return await User.findById(parent.user);
        },
    },
    Entity: {
        __resolveType(obj) {
            return obj.__typename;
        },
    },
    Query: {
        userNotificationById: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            return await UserNotification.findById(id);
        },
        listUserNotifications: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            let userNotifications = await UserNotification.find({user:user.id}).notDeleted();
            console.log("userNotifications:", userNotifications)
            return userNotifications;
        },

    },
    Mutation: {
        createNotification: async (_, {newNotification}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                let notification = {
                    ...newNotification,
                    sender:user.id,
                }
                console.log("notification")
                return await createNotification(notification)
            } catch (err) {
                console.log("error", e)
                return new ApolloError(err, 500)
            }
        },
        viewNotification: async (_, {id}, {user, isAuth}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await UserNotification.findOneAndUpdate({_id: id}, {isSeen:true}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
        deleteNotification: async (_, {id}, {user}) => {
            if (!isAuth) {
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try {
                await UserNotification.findOneAndUpdate({_id: id}, {isDeleted:true}, {new: true});
                return true
            } catch (err) {
                return new ApolloError(err, 500);
            }
        },
    },
}

module.exports = resolvers;
