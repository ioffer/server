const {gql} = require('apollo-server-express');


const enumsTypeDefs = gql`

    enum Status {
        PENDING
        NOT_SUBMITTED
        VERIFIED
        REJECTED
        ARCHIVED
        DELETED
        UPCOMING
        PUBLISHED
        DRAFT
        ACCEPTED
        EXPIRED
    }

    enum Role {
        SUPER_ADMIN
        ADMIN
        MODIFIER
        WATCHER
        OWNER
        USER
    }


    enum Verified {
        REJECTED
        PENDING
        VERIFIED
    }

    enum Sort{
        NEWEST
        LOW_TO_HIGH
        HIGH_TO_LOW
        TOP_SOLD
    }

    enum MediaTypes {
        AVATAR
        IMAGE
        BOOKLET
        THUMBNAIL
        LOGO
        VIDEO
        VIDEO_THUMBNAIL
    }

    type MessageResponse {
        message: String!
        success: Boolean
    },
    
    type Moderator {
        userId: ID!,
        userName: String,
        userEmail: String,
        status: Status
        role: Role,
    }


`;

module.exports = enumsTypeDefs;
