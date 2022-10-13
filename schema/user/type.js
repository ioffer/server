const {gql} = require('apollo-server-express');


const userTypeDefs = gql`

    input UserRegisterInput  {
        fullName: String!,
        userName: String!,
        email: String!,
        password: String!,
    }

    input UserInput {
        fullName: String,
        avatar: String,
        location: String,
        type:Role,
    }
    
    type User {
        id: ID!,
        isBlocked:Boolean!,
        fullName: String!,
        userName: String!,
        email: String!,
        password: String!,
        confirmed: Boolean!,
        status(status:Status):String,
        resetPasswordToken: String,
        emailConfirmToken: String,
        twoFactorEnabled:Boolean!,
        twoFactorSecret:String!,
        twoFactorCode: String,
        avatar: String,
        location: String,
        type(type:Role): String,
        createdAt: String,
        updatedAt: String,
        kyc: Kyc,
        shops:[Shop],
        brands:[Brand],
        favorites:Favorite,
        pins:Pin,
        subscriptions:UserSubscription,
        roleBasedAccess:RoleBasedAccess,
    }
    
    
    type Kyc {
        mobile: String,
        gender: String,
        birthDate: String,
        nationality: String,
        country: String,
        postalCode: String,
        city: String,
        street: String,
        building: String,
        kycStatus(status: Status): String!
    }
    
    type AuthUser {
        user: User!
        token:String!
    }

`;



module.exports = userTypeDefs;
