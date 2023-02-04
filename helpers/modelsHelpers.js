import mongoose from "mongoose";

export const modelArrayManager = async (Model, field, previousArray, newArray, id, slagField='title') => {
    try {
        let update = {}
        update[field] = id;
        if (previousArray) {
            let previousArray = new Set(previousArray);
            previousArray.delete('')
            previousArray = [...previousArray]
        }
        if (newArray) {
            let newArray = new Set(newArray);
            newArray.delete('')
            newArray = [...newArray]
        }
        let commonData = previousArray.filter(value => newArray.includes(value));
        let newData = newArray.filter(x => !previousArray.includes(x))
        let deletedData = previousArray.filter(x => !newArray.includes(x))
        let newModelsResponse = null, oldModelsResponse= null;
        if (newData.length > 0) {
            newModelsResponse = await mongoose.model(Model).updateMany({_id: {$in: newData}}, {$push: update}, {new: true})
        }
        if (deletedData.length > 0) {
            oldModelsResponse = await mongoose.model(Model).updateMany({_id: {$in: deletedData}}, {$pull: update}, {new: true})

        }
        let newArrayData = await mongoose.model(Model).find({_id: {$in: deletedData}}).select(slagField)

        return {
            newArray,
            newArrayData,
            previousArray,
            commonData,
            newData,
            deletedData,
            newModelsResponse,
            oldModelsResponse,
            status: true
        }
    } catch (e) {
        return {
            status: false
        }
    }
}