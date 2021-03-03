import dateTime from "../../helpers/DateTimefunctions";
import {AuthenticationError, ApolloError} from "apollo-server-express"
const {UnBlockRequest, User} = require('../../models');


let fetchData = async() => {
    return await UnBlockRequest.find();
}

const resolvers = {
    UnBlockRequest:{
        user:async (parent)=>{
            return await User.findOne({"_id":parent.user})
        },
    },

    Query: {
        unBlockRequests:async(_)=>{
            return await fetchData();
        },

    },
    Mutation: {
        unBlockUser: async (_, {id}, {UnBlockRequest, user}) => {
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            if(user.type==='ADMIN'){
                let unBlockRequest = await UnBlockRequest.findById(id)
                await User.findByIdAndUpdate(unBlockRequest.user,{'isBlocked':false});
                await UnBlockRequest.findByIdAndDelete(id)
                return true
            }
            return false

        },

        createUnBlockRequest: async (_, {description},{user, UnBlockRequest}) => {
            if(!user){
                return new AuthenticationError("Authentication Must Be Provided")
            }
            try{
                let unBlockRequest = UnBlockRequest({
                    description: description,
                    user:user.id,
                })
                return unBlockRequest.save()
            }catch(e){
                throw new ApolloError("Internal Server Error", 500)
            }
        }

    }
}

module.exports = resolvers;
