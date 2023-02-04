const {gql} = require('apollo-server-express');

const notificationTypeDefs = gql`
    
    input NotificationInput {
        title: String,
        description: String,
        messageTitle: String,
        messageBody: String,
        entityType:String,
        entity:ID!,
        link:String,
    }

    type Notification {
        title: String,
        description: String,
        messageTitle: String,
        messageBody: String,
        sender: User,
        entityType(entityType:Model): Model,
        entityData:Entity
        entity:ID!,
        link:String,
    }
    
    type UserNotification {
        notification: Notification!,
        user: User!,
        isSeen:Boolean!,
        isDeleted:Boolean!,
    }
    
    type UserNotifications{
        userNotifications: [UserNotification],
        pagination:Pagination,
    }
    
`;


module.exports = notificationTypeDefs;
