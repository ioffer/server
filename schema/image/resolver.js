import {join, parse} from 'path';
import {createWriteStream} from 'fs';
import {BASE_URL} from '../../config';
import {ApolloError, AuthenticationError} from 'apollo-server-express';

const resolvers = {
    Query: {
        uploads: () => "No Response",
    },
    Mutation: {

        imageUploader: async (_, {file},{user}) => {
            try {
                const {
                    filename,
                    createReadStream
                } = await file;
                let stream = createReadStream();
                let {
                    ext,
                    name
                } = parse(filename);
                console.log(name,ext)
                name = name.replace(/([^a-z0-9 ]+)/gi, '-').replace(' ', '_');
                let serverFile = join(
                    __dirname, `../../uploads/${name}-${Date.now()}${ext}`
                );
                serverFile = serverFile.replace(' ', '_');

                let writeStream = await createWriteStream(serverFile);
                await stream.pipe(writeStream);
                let correctedPath=""
                if(!(serverFile.split('uploads')[1][0]==='/')){
                    let wrongPath=serverFile.split('uploads')[1];
                    correctedPath = wrongPath.replace("\\","/")
                    serverFile = `${correctedPath}`;

                }else{
                    serverFile = `${serverFile.split('uploads')[1]}`;
                }

                return serverFile;
            } catch (err) {
                console.error(err)
                return new ApolloError( err, 500)
            }
        }
    },

}

module.exports = resolvers;
