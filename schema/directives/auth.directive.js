import {defaultFieldResolver} from "graphql";
import {AuthenticationError, SchemaDirectiveVisitor} from 'apollo-server-express';

export class IsAuthDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const {
            resolve = defaultFieldResolver
        } = field;

        field.resolve = async function (...args) {
            let [_, {}, {
                user,
                isAuth
            }] = args;
            if (isAuth) {
                return await resolve.apply(this, args);
            }else if(!user){
                throw new AuthenticationError("Authentication Must Be Provided")
            } else {
                throw new AuthenticationError("Authentication Must Be Provided")
            }
        };
    }
}
