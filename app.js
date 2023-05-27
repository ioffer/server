import express from 'express';
import path, {join} from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sassMiddleware from 'node-sass-middleware';
import {ApolloServer} from 'apollo-server-express';
import typeDefs from './schema/typeDefs.js';
import resolvers from './schema/resolver.js';
import indexRouter from './routes/index';
import usersRouter from './routes/users';
import AuthMiddleware from './middleware/auth.js';
import QueryOptionsMiddleware from './middleware/queryOptions.js';
import {graphqlUploadExpress} from 'graphql-upload';
import connectDB from './utils/connectDB';
import cors from 'cors';
import {expressErrorHandler, formatError} from './helpers/handleErrors'
import {ApolloServerPluginInlineTrace, ApolloServerPluginLandingPageGraphQLPlayground} from 'apollo-server-core';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {authDirectiveTransformer, authDirectiveTypeDefs,} from './schema/directives/isAuth2.directive';
import AppModels from './models';
import LogRocket from 'logrocket';
LogRocket.init('2oiqcd/ioffer');

const app = express();

const port = process.env.PORT || process.env.port || 4001;
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
app.use(expressErrorHandler);
app.use(
  sassMiddleware({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true, // true = .sass and false = .scss
    sourceMap: true,
  })
);
app.use(express.static(path.join(__dirname, 'public')));
app.use(AuthMiddleware);
app.use(QueryOptionsMiddleware);

app.use('/', indexRouter);
app.use('/users', usersRouter);

let schema = makeExecutableSchema({
  typeDefs: [authDirectiveTypeDefs, typeDefs],
  resolvers,
});
schema = authDirectiveTransformer(schema);
const server = new ApolloServer({
  schema,
  introspection: true,
  playground: {
    settings: {
      'editor.theme': 'light',
    },
    tabs: [
      {
        endpoint: '/graphql',
      },
    ],
  },
  plugins: [
    ApolloServerPluginInlineTrace(),
    ApolloServerPluginLandingPageGraphQLPlayground({
      settings: {
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
    }),
  ],
  context: ({req}) => {
    let {user, isAuth} = req;
    let {variables} = req.body;
    console.log('variables:🚀', variables);
    return {
      req,
      user,
      isAuth,
      ...AppModels,
    };
  },
  formatError
});

// error handler

(async () => {
  await server.start();
  server.applyMiddleware({app});
  connectDB()
  app.listen(port, () => {
    console.log('🚀 now listening for requests on port', port);
  });
})();

export default app;
