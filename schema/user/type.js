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
        balance: String,
        location: String,
        type:Type,
    }
    
    type User {
        id: ID!,
        isBlocked:Boolean!,
        fullName: String!,
        userName: String!,
        email: String!,
        password: String!,
        confirmed: Boolean!,
        resetPasswordToken: String,
        emailConfirmToken: String,
        twoFactorEnabled:Boolean!,
        twoFactorSecret:String!,
        twoFactorCode: String,
        avatar: String,
        location: String,
        type(type:Type): String,
        createdAt: String
        updatedAt: String
        kyc: Kyc,
#        shops:[Shops],
    }
    
    
    type Kyc {
        mobile: String,
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
