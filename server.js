
import { ApolloServer } from "apollo-server-express";
import typeDefs from './schema/typeDefs.js'
import resolvers from './schema/resolver.js'
import express from "express";
import mongoose from 'mongoose'
import createError from 'http-errors'
import path from 'path'
import { join } from "path";

import cookieParser from 'cookie-parser'
import logger from 'morgan'
import sassMiddleware from 'node-sass-middleware'
import indexRouter from './routes/index'
import usersRouter from './routes/users'
import AuthMiddleware from './middleware/auth.js';
import cors from 'cors';

const app = express();

app.use(cors());

// view engine setup
app.use(express.static(join(__dirname, './uploads')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true, // true = .sass and false = .scss
    sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(AuthMiddleware)
app.use('/', indexRouter);
app.use('/users', usersRouter);

const uri = "mongodb://qasim:qasim1234@abdulla-shard-00-00.eftvp.mongodb.net:27017,abdulla-shard-00-01.eftvp.mongodb.net:27017,abdulla-shard-00-02.eftvp.mongodb.net:27017/ioffer?ssl=true&replicaSet=abdulla-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(uri);
mongoose.Promise = global.Promise;

// // catch 404 and forward to error handler
// app.use(function (req, res, next) {
//     next(createError(404));
// });
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

(async () => {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });
    mongoose.connection.once('open', () => {
        console.log(' 🍃 connected to mongoDB mLab');
        app.listen(process.env.port ||4000, () => {
            console.log('🚀 now listening for requests on port', process.env.port ||4000);
        });
    })
})()

