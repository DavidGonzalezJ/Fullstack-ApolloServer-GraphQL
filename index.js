const {MONGODB_URI, PORT, JWT_SECRET} = require('./utils/config')
const { GraphQLError } = require('graphql')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const jwt = require('jsonwebtoken')

const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
//const { v1: uuid } = require('uuid')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  }).catch((error) => {
    console.log('connection error:', error.message)
  })

/*let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]*/

const typeDefs = `
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  type Token {
    value: String!
  }
  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }
  type Author {
    name: String!
    born: Int
    id: ID!
    bookCount: Int!
  }
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }
  type Mutation {
    addBook(
        title: String!
        author: String!
        published: Int!
        genres: [String!]!
    ): Book
    addAuthor(
        name: String!
        born: Int
    ): Author
    editAuthor(
        name: String!
        setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
        const firstFilterList =  !args.author
          ? await Book.find({})
          : await Book.find({ author: args.author })
        const secondFilterList = !args.genre
          ? firstFilterList
          : firstFilterList.filter(b => b.genres.includes(args.genre))
        
        return secondFilterList
    },
    allAuthors: async () => Author.find({}),
    me: (root, args, context) => { return context.currentUser }
  },
  Mutation: {
    addBook: async (root, args, context) => {
        if(!context.currentUser) return null

        const bookAuthor = await Author.findOne({name: args.author})
        
        if(!bookAuthor) {
          const newAuthor = new Author({
            name: args.author,
            bookCount: 1
          })
          try {
            const author = await newAuthor.save()
            const newBook = new Book({ ...args, author: author })
            const res = await newBook.save()
            return res
          } catch (error) {
            throw new GraphQLError('Saving failed', {
              extensions: {
                code: 'BAD_USER_INPUT',
                error
              }
            })
          }
        }

        try { 
          const updatedAuthor = await Author.findByIdAndUpdate(bookAuthor.id,
          { bookCount: bookAuthor.bookCount + 1},
          { new:true, runValidators: true, context: 'query' })
          const newBook = new Book({ ...args, author: updatedAuthor })
          const res = await newBook.save()
          return res 
        } catch (error) {
          throw new GraphQLError('Saving failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              error
            }
          })
        }
    },
    addAuthor: async (root, args, context) => {
        if(!context.currentUser) return null

        const newAuthor = new Author({
            ...args
        })
        try {
          const res = await newAuthor.save()
          console.log('Error aquí!', res)
          return res
        } catch (error){
          throw new GraphQLError('Saving failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.name,
              error
            }
          })
        }
    },
    editAuthor: async (root, args, context) => {
        if(!context.currentUser) return null


        const author = await Author.findOne({ name: args.name })
        if(!author) return null

        try { 
          const updatedAuthor = await Author.findByIdAndUpdate(author.id,
            { born: args.setBornTo },
            { new:true, runValidators: true, context: 'query' })

          return updatedAuthor
      } catch (error) {
        throw new GraphQLError('Updating author failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.setBornTo,
            error
          }
        })
      }
    },
    createUser: async (root, args) => {
      const user = new User({ ...args })
      return user.save()
      .catch(error => {
        throw new GraphQLError('Creating the user failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error
          }
        })
      })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
      if( !user || args.password !== 'secret'){
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT'
          }
        })     
      }
      const userForToken = {
        username: user.username,
        id: user._id
      }
      return { value: jwt.sign(userForToken, JWT_SECRET) }
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: PORT },
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
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})