// const fs = require('fs');
// const path = require('path');
// const {toTitleCase} = require('../helpers/TitleCase');
export {default as User} from './user';
export {default as UserFavourite} from './userFavourite';
export {default as UserPin} from './userPin';
export {default as UserRoleBaseAccess} from './userRoleBaseAccess';
export {default as UserSubscription} from './userSubscription';
export {default as Promotion} from './promotion';
export {default as Shop} from './shop';
export {default as UnBlockRequest} from './unBlockRequest';
export {default as Offer} from './offer';
export {default as Brand} from './brand';
export {default as BrandClick} from './brandClick';
export {default as BrandRoleBaseAccessInvite} from './brandRoleBaseAccessInvite';
export {default as BrandView} from './brandView';
export {default as ShopClick} from './shopClick';
export {default as ShopRoleBaseAccessInvite} from './shopRoleBaseAccessInvite';
export {default as ShopView} from './shopView';
export {default as Category} from './category';
export {default as Link} from './link';
export {default as Media} from './media';

//
// let Models = {}
// fs.readdirSync(__dirname)
//     .filter((file) => {
//         console.log('file = ', file)
//         return (
//             file.indexOf('.') !== 0 && file !== 'index.js' && file.slice(-3) === '.js'
//         )
//     })
//     .forEach((file) => {
//         file = toTitleCase(file).slice('.js')[0];
//         Models[file]=file;
//     })
// console.log("Models:",Models)
// export default Models;