import {Media} from "../../models";
import {readFile, multipleReadFiles} from '../../middleware/file'
import {GraphQLUpload} from "graphql-upload"


import {ApolloError, AuthenticationError, UserInputError} from 'apollo-server-express';

const resolvers = {
    Upload: GraphQLUpload,
    Query: {
        greeting: () => {
            return 'Hello World!'
        },
    },

    Mutation: {
        singleUpload: async (_, { file, mediaType},{user}) => {
            console.log('user', user)
            const imageUrl = await readFile(file)
            const singleFile = new Media({ url: [imageUrl],uploadedBy:user.id,mediaType})
            console.log('singlefile', singleFile)
            await singleFile.save()
            return singleFile;
        },

        multipleUpload: async (_, { files ,mediaType},{user}) => {
            const imageURL = await multipleReadFiles(files)
            console.log('images URL: ', imageURL)
            const multiplefile = new Media({
                url:[],
                uploadedBy: user.id,
                mediaType
            });
            multiplefile.url.push(...imageURL)
            await multiplefile.save()
            return multiplefile;
        },
    },
}

module.exports = resolvers;
