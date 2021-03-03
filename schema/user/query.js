const {gql} = require('apollo-server-express');

const userQuery = gql`
    extend type Query {
        authUser: User @isAuth,
        loginUser(userName: String!, password: String!):AuthUser!,
        verify2FA(token: String!):Boolean! @isAuth,
        users: [User],
        me:User! @isAuth,
#        getBalance:User! @isAuth,
        userById(id:ID!):User,
        searchPendingKyc:[User] @isAuth,
        searchUnBlockedUsers: [User] @isAuth
        getPrivateKey(password:String!):User! @isAuth,

    },
    
    extend type Mutation {
        verifyKyc(id:ID!):Boolean @isAuth,
        cancelKyc(id:ID!):Boolean @isAuth,
        registerUser(newUser: UserRegisterInput!): AuthUser!,
        editUser(newUser: UserInput!): User @isAuth,
        confirmEmail(token: String!): Boolean!,
        forgetPassword(email: String!): Boolean!,
        resetPassword(token: String!, password:String!): Boolean!,
        changePassword(password:String!, newPassword:String!):Boolean!,
        enable2FA:User @isAuth,
        transferBalance(account: String!, amount:String!):Boolean!,
        disable2FA:Boolean! @isAuth,
        blockUser(id:ID!):Boolean!
        addUser(
            fullName: String,
            userName:String,
            email:String,
            password:String,
        ): User,
        deleteUser(
            id: String!,
        ):User,
        addKyc(
            id:String!,
            mobile:String,
            birthDate:String,
            nationality:String,
            country:String,
            postalCode:String,
            city:String,
            street:String,
            building:String,
            kycStatus:Status #hello
        ):User @isAuth,
        editKyc(
            id:String!,
            mobile:String,
            birthDate:String,
            nationality:String,
            country:String,
            postalCode:String,
            city:String,
            street:String,
            building:String,
            kycStatus:Status #hello
        ):User @isAuth,
        addTestAddress:User! @isAuth,
        createAdmin(email:String!):Boolean! @isAuth,
        addTestAddress:User! @isAuth,
        deleteTestAddress(testAddressId:ID!):User! @isAuth,
        request5DAppsCoin(testAddressId:ID!):User! @isAuth,
    }
    
`;



module.exports = userQuery;
