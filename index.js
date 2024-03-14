const {MONGODB_URI, PORT} = require('./utils/config')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)

const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
//const { v1: uuid } = require('uuid')
const Book = require('./models/book')
const Author = require('./models/author')

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
    dummy: Int
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
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
  }
`

const resolvers = {
  Author: {
    /**/bookCount: (root) => {
        /*const authorBooks = books.filter(b => b.author === root.name)
        return authorBooks.length*/
    }
  },
  Query: {
    dummy: () => 0,
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
        /*const bookList = !args.author ? books : books.filter(b => b.author === args.author)
        const booksFiltered = !args.genre ? bookList : bookList.filter(b => b.genres.includes(args.genre))
        
        return booksFiltered*/
        return Book.find({})
    },
    allAuthors: async () => Author.find({})
  },
  Mutation: {
    addBook: async (root, args) => {
        const bookAuthor = await Author.findOne({name: args.author})
        console.log(bookAuthor)
        
        if(!bookAuthor) {
          const newAuthor = new Author({
            name: args.author,
            bookCount: 1
          })
          const author = await newAuthor.save()
          const newBook = new Book({ ...args, author: author })
          const res = await newBook.save()
          return res
        }
        
        const updatedAuthor = await Author.findByIdAndUpdate(bookAuthor.id,
          { bookCount: bookAuthor.bookCount + 1},
          {new:true, runValidators: true, context: 'query'})
        const newBook = new Book({ ...args, author: updatedAuthor })
        const res = await newBook.save()
        return res
    },
    addAuthor: async (root, args) => {
        const newAuthor = new Author({
            ...args
        })
        const res = await newAuthor.save()
        console.log(res)
        return res
    },
    /**/editAuthor: (root, args) => {
        /*const author = authors.find(a => a.name === args.name)
        if(!author) return null

        const updatedAuthor = {...author, born: args.setBornTo}
        authors = authors.map(author => author.id === updatedAuthor.id
            ? updatedAuthor
            : author)

        return updatedAuthor*/
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: PORT },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})