import { createWriteStream } from 'fs'
import { parse, join } from 'path'

export const readFile = async (file) => {
    // This is single ReadFile
    const { createReadStream, filename, mimetype } = await file
    const stream = createReadStream()
    let { name, ext } = parse(filename)
    name = `single${Math.floor(Math.random() * 10000 + 1)}`
    let url = join(__dirname, `../uploads/${name}-${Date.now()}${ext}`)
    const imageStream = await createWriteStream(url)
    await stream.pipe(imageStream)
    // const baseURL = process.env.BASE_URL
    // const port = process.env.PORT
    url = `http://localhost:4000${url.split('uploads')[1]}`
    return url
}

export const multipleReadFiles = async (files) => {
    //Multiple files Upload
    let fileUrl = []
    for (let i = 0; i < files.length; i++) {
        const url = await readFile(files[i])
        fileUrl.push(url)
    }
    return fileUrl
}

// const { createReadStream, filename, mimetype } = await files[i]
// const stream = createReadStream()
// let { name, ext } = parse(filename)
// name = `single${Math.floor(Math.random() * 10000 + 1)}`
// let url = join(__dirname, `../uploads/${name}-${Date.now()}${ext}`)
// const imageStream = await createWriteStream(url)
// await stream.pipe(imageStream)
// const baseURL = process.env.BASE_URL
// const port = process.env.PORT
// url = `http://localhost:4000${url.split('uploads')[1]}`
