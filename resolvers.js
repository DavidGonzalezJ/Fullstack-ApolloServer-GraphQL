const { JWT_SECRET } = require('./utils/config')
const { GraphQLError } = require('graphql')
const jwt = require('jsonwebtoken')

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

const resolvers = {
    Query: {
      bookCount: async () => Book.collection.countDocuments(),
      authorCount: async () => Author.collection.countDocuments(),
      allBooks: async (root, args) => {
          const firstFilterList =  !args.author
            ? await Book.find({}).populate('author')
            : await Book.find({ author: args.author }).populate('author')
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
        const res = { 
          user: user,
          value: jwt.sign(userForToken, JWT_SECRET) 
        }
        return res
      }
    }
  }

module.exports = resolvers