const {gql} = require('apollo-server-express');


const shopTypeDefs = gql`

    input ShopInput {
        name: String!,
        category:[ID]!,
        subCategory:[ID],
        logo: ID,
        coverImage:ID,
        tags:[ID],
        website: String,
        phoneNumbers: String!,
        mobileNumber: String,
        location: String!,
        address: String!,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        status:String,
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
        phoneNumbers: String,
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
        admin: [User],
        modifier: [User],
        watcher: [User],
        subscribers: [User],
        roleBaseAccessInvites:ShopRoleBaseAccessInvite,
        verifiedBy: User,
        promotions: [Promotion],
#        offers: [Offer]
    }
    
`;


module.exports = shopTypeDefs;
