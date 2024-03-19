const { MONGODB_URI, PORT, JWT_SECRET } = require('./utils/config')
const { GraphQLError } = require('graphql')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const jwt = require('jsonwebtoken')

const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@apollo/server/express4')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const express = require('express')
const cors = require('cors')
const http = require('http')

//const { startStandaloneServer } = require('@apollo/server/standalone')
//const { v1: uuid } = require('uuid')
//const Book = require('./models/book')
//const Author = require('./models/author')
const User = require('./models/user')
const typeDefs = require('./schema')
const resolvers = require('./resolvers')

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  }).catch((error) => {
    console.log('connection error:', error.message)
  })


//setup function

const start = async () => {
  const app = express()
  const httpServer = http.createServer(app)

  const server = new ApolloServer({
    schema: makeExecutableSchema({typeDefs, resolvers}),
    plugins: [ApolloServerPluginDrainHttpServer({httpServer})]
  })

  await server.start()

  app.use(
    '/',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({req, res}) => {
        const auth = req ? req.headers.authorization : null
        if(auth && auth.startsWith('bearer ')){
          try{ 
            const decodedToken = jwt.verify(
              auth.substring(7), JWT_SECRET
            )
            const currentUser = await User.findById(decodedToken.id)
            return { currentUser }
          }catch(error){
            throw new GraphQLError('wrong authorization token', {
              extensions: {
                code: 'BAD_TOKEN'
              }
            })    
          }
        }
      }
    })
  )
  httpServer.listen(PORT, () => 
    console.log(`Server is now running on http://localhost:${PORT}`))
}


start()