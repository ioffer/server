import {
    IsAuthDirective,
} from './auth.directive';
import {
    authDirectiveTypeDefs, authDirectiveTransformer
} from './isAuth2.directive';

export const schemaDirectives = {
    isAuth: IsAuthDirective,
    isAuth2: authDirectiveTransformer,
};