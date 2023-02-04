import createError from 'http-errors'
import LogRocket from 'logrocket';
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import sassMiddleware from 'node-sass-middleware'
import {ApolloServer, ApolloError} from 'apollo-server-express'
import typeDefs from './schema/typeDefs.js'
import resolvers from './schema/resolver.js'
import mongoose from 'mongoose'
import indexRouter from './routes/index'
import usersRouter from './routes/users'
import AuthMiddleware from './middleware/auth.js';
import {graphqlUploadExpress} from 'graphql-upload';
import {join} from "path";
let cors=require('cors');
import { ApolloServerPluginLandingPageGraphQLPlayground, ApolloServerPluginLandingPageDisabled, ApolloServerPluginInlineTrace } from 'apollo-server-core';
import { makeExecutableSchema } from '@graphql-tools/schema'
import {authDirectiveTypeDefs, authDirectiveTransformer} from './schema/directives/isAuth2.directive'



import { v4 } from "uuid";
import AppModels, {User} from './models';

let app = express();

const uri = "mongodb://qasim:qasim1234@abdulla-shard-00-00.eftvp.mongodb.net:27017,abdulla-shard-00-01.eftvp.mongodb.net:27017,abdulla-shard-00-02.eftvp.mongodb.net:27017/ioffer?ssl=true&replicaSet=abdulla-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(uri);
mongoose.set('debug', true);
mongoose.Promise = global.Promise;
const port = process.env.PORT || process.env.port || 4001
app.use(cors());

// view engine setup
app.use(express.static(join(__dirname, './uploads')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(graphqlUploadExpress());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
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

let schema = makeExecutableSchema({
    typeDefs: [
        authDirectiveTypeDefs,
        typeDefs,
    ],
    resolvers,
})
schema = authDirectiveTransformer(schema)
const server = new ApolloServer({
    schema,
    introspection: true,
    playground: {
        settings: {
            'editor.theme': 'light',
        },
        tabs: [
            {
                endpoint:"/graphql",
            },
        ],
    },
    plugins: [
        ApolloServerPluginInlineTrace(),
        ApolloServerPluginLandingPageGraphQLPlayground(
            {
                settings: {
                    // 'some.setting': true,
                    'general.betaUpdates': false,
                    'editor.theme': 'dark',
                    'editor.cursorShape': 'line',
                    'editor.reuseHeaders': true,
                    'tracing.hideTracingResponse': true,
                    'queryPlan.hideQueryPlanResponse': true,
                    'editor.fontSize': 14,
                    'editor.fontFamily': `'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace`,
                    'request.credentials': 'omit',
                },
            }
        ),
    ],
    context: ({req}) => {
        let {
            user,
            isAuth,
        } = req;
        return {
            req,
            user,
            isAuth,
            ...AppModels,
        };
    },
    formatError:(err)=> {
        console.log("err:", JSON.stringify(err))
        console.log("Error name:", err.extensions.code)
        if (err.extensions.code === "UNAUTHENTICATED") {
            return new Error('Authentication Must Be Provided');
        }else if (err.message.startsWith("Database Error")) {
            return new Error('Database Error');
        }else if (err.extensions.exception.name === 'ValidationError') {
            return new Error(err.extensions.exception.errors);
        }else if (err.extensions.code === 'GRAPHQL_VALIDATION_FAILED') {
            return new Error(err.message);
        }else if (err.originalError instanceof ApolloError) {
            return err;
        } else{
            const errId = v4();
            console.log("errId: ", errId);
            console.error('error:', err);
            console.error('errorArray:', err.extensions.exception.stacktrace);
            // return new Error(err);
            return new Error('Internal Server Error: '+errId);
            // return err
        }
    },
});

(async ()=>{
    await server.start();
    server.applyMiddleware({app});
    mongoose.connection.once('open', () => {
        console.log(' 🍃 connected to mongoDB mLab1');
        app.listen( port, () => {
            console.log('🚀 now listening for requests on port',  port);
            LogRocket.init('2oiqcd/ioffer');
        });
    })
})()


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


module.exports = app;