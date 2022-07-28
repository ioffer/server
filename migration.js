const mongoose = require('mongoose')
const Category = require('./models/category')
const CategorySeeds = require('./seeds/category')
const uri = "mongodb://qasim:qasim1234@abdulla-shard-00-00.eftvp.mongodb.net:27017,abdulla-shard-00-01.eftvp.mongodb.net:27017,abdulla-shard-00-02.eftvp.mongodb.net:27017/ioffer?ssl=true&replicaSet=abdulla-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(uri);
mongoose.Promise = global.Promise;
let array = [];
let keyarray = [];

(async () => {
    mongoose.connection.once('open', async () => {
        await Category.deleteMany({});
        console.log(' 🍃 connected to mongoDB mLab', CategorySeeds);
        await convertToArray(CategorySeeds);
        console.log('keyarray:',keyarray)
        console.log('array:',array)
    })
})()

async function convertToArray(object = null, parentCategory = null, level = 0) {
    for (const [key, value] of Object.entries(object)) {
        let parentCategoryId = parentCategory ? parentCategory.id : null
        let newCategory = new Category({
            title: key,
            level,
            parentCategory: parentCategoryId,
            subCategories: []
        })

        if (value !== {}) {
            await convertToArray(value, newCategory, level + 1);
        }
        if (parentCategory) {
            parentCategory.subCategories.push(newCategory.id)
        }
        keyarray.push(key);
        array.push(newCategory)
        await newCategory.save()
    }
}