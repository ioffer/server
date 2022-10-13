const {gql} = require('apollo-server-express');


const shopTypeDefs = gql`

    input ShopInput {
        name: String!,
        brand:ID,
        category:[ID!]!,
        subCategory:[ID!]!,
        logo: ID,
        coverImage:String,
        tags:[ID],
        website: String,
        phoneNumber: String!,
        mobileNumber: String,
        location: String!,
        address: String!,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        status:Status,
        email:String,
    }

    type Shop {
        id: ID!,
        name: String,
        email: String,
        category:[Category],
        subCategory:[Category],
        logo: Media,
        coverImage: Media,
        tags:[Tag],
        website: String,
        phoneNumber: String,
        mobileNumber: String,
        location: String,
        address: String,
        publishingDateTime:String,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        isBlocked: Boolean,
        status(status:Status):String,
        verified(verified: Verified): String,
        viewCounts: Int,
        clickCounts: Int,
        subscriberCounts: Int,
        owner: User,
        brand: Brand,
        admins: [User],
        modifiers: [User],
        watchers: [User],
        subscribers: [User],
        roleBaseAccessInvites:ShopRoleBaseAccessInvite,
        verifiedBy: User,
        promotions: [Promotion],
#        offers: [Offer]
    }
    
`;


module.exports = shopTypeDefs;
