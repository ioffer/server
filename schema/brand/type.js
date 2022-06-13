const {gql} = require('apollo-server-express');


const brandTypeDefs = gql`

    input BrandInput {
        name: String,
        category:[ID],
        subCategory:[ID],
        logo: ID,
        coverImage:ID,
        tags:[String],
        website: String,
        phoneNumbers: String,
        mobileNumber: String,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
    }

    type Brand {
        id: ID!,
        name: String,
        category:[String],
        subCategory:[String],
        logo: Media,
        coverImage: Media,
        tags:[String],
        website: String,
        phoneNumbers: String,
        mobileNumber: String,
        publishingDateTime:String,
        facebook: String,
        tiktok: String,
        twitter: String,
        instagram: String,
        youtube: String,
        linkedIn: String,
        status(status:Status):String,
        isBlocked: Boolean,
        verified(verified:Verified):String,
        viewCounts: Int,
        clickCounts: Int,
        subscriberCounts: Int,
        owner: User,
        brandShops:[Shop],
        admins:[User],
        modifiers:[User],
        watchers:[User],
        subscribers:[User],
        roleBaseAccessInvites:[BrandRoleBaseAccessInvite]
        verifiedBy: User,
        promotions: [Promotion],
        createdAt: String,
        updatedAt: String,
        #        offers: [Offer]
    }
    
`;


module.exports = brandTypeDefs;
