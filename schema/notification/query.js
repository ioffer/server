  const {gql} = require('apollo-server-express');

const notificationQuery = gql`
    extend type Query {
        userNotificationById(id:ID!):UserNotification @isAuth,
        listUserNotifications:[UserNotification] @isAuth,
    },
    
    extend type Mutation {
        createNotification(newNotification: NotificationInput!):Boolean @isAuth,
        viewNotification(id:ID!): Boolean @isAuth
        deleteNotification(id: ID!):Boolean @isAuth,
    }
    
`;


module.exports = notificationQuery;
