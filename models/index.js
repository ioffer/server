// const fs = require('fs');
// const path = require('path');
// const {toTitleCase} = require('../helpers/TitleCase');
export {default as User} from './user';
export {default as Promotion} from './promotion';
export {default as Shop} from './shop';
export {default as UnBlockRequest} from './unBlockRequest';
export {default as Offer} from './offer';

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