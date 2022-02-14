const bcrypt = require('bcryptjs') // 載入 bcrypt
const db = require('../models')
const { User, Comment, Restaurant, Favorite, Like } = db

const { getUser } = require('../helpers/auth-helpers')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => {
    // 取得錯誤處理當下所發出的 form body
    const body = req.flash('body')
    const bodyParse = body.length ? JSON.parse(body) : ''
    res.render('signup', { ...bodyParse })
  },
  signUp: (req, res, next) => {
    const { name, email, password, passwordCheck } = req.body

    // 如果兩次輸入的密碼不同，丟出 Error
    if (password !== passwordCheck) throw new Error('Passwords do not match!')

    // 確認使用者是否註冊
    User.findOne({ where: { email } })
      .then(user => {
        // 已註冊就拋出 Error
        if (user) throw new Error('Email already exists!')
        // 正常註冊程序
        return bcrypt.hash(password, 10)
      })
      .then(hash => User.create({ name, email, password: hash }))
      .then(() => {
        req.flash('success_messages', '成功註冊帳號！')
        res.redirect('/signin')
      })
      // 接住前面拋出的錯誤，呼叫專門做錯誤處理的 middleware
      .catch(err => next(err))
  },
  signInPage: (req, res) => {
    // 取得錯誤處理當下所發出的 form body
    const body = req.flash('body')
    const bodyParse = body.length ? JSON.parse(body) : ''
    res.render('signin', { ...bodyParse })
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: (req, res, next) => {
    return Promise.all([
      User.findByPk(req.params.id, { raw: true }),
      Comment.findAll({
        where: { userId: req.params.id },
        include: Restaurant,
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true
      })
    ])
      .then(([user, comments]) => {
        if (!user) throw new Error("User didn't exist!")
        //  Whether user is self
        user.self = user.id === getUser(req).id
        // filter repeat by checking first item
        const checkArray = []
        const filteredComments = comments.filter(comment => {
          const id = comment.Restaurant.id
          if (checkArray.includes(id)) return false
          checkArray.push(id)
          return true
        })
        res.render('users/profile', { user, filteredComments, commentCounts: comments.length })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    return User.findByPk(req.params.id, { raw: true })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        //  Whether user is self
        if (user.id !== getUser(req).id) throw new Error("Can't edit others!")
        res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const id = req.params.id
    const { name } = req.body
    const { file } = req // 把檔案取出來
    if (!name.trim()) throw new Error("Name can't be empty!")

    return Promise.all([User.findByPk(id), imgurFileHandler(file)])
      .then(([user, filePath]) => {
        if (!user) throw new Error("User didn't exist!")
        //  Whether user is self
        if (user.id !== getUser(req).id) throw new Error("Can't edit others!")
        return user.update({ name: name.trim(), image: filePath || user.image })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${id}`)
      })
      .catch(err => next(err))
  },
  addFavorite: (req, res, next) => {
    const userId = getUser(req).id
    const { restaurantId } = req.params
    return Promise.all([Restaurant.findByPk(restaurantId), Favorite.findOne({ where: { userId, restaurantId } })])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (favorite) throw new Error('You have favorited this restaurant!')

        return Favorite.create({ userId, restaurantId })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
    const userId = getUser(req).id
    return Favorite.findOne({
      where: { userId, restaurantId: req.params.restaurantId }
    })
      .then(favorite => {
        if (!favorite) throw new Error("You haven't favorited this restaurant")
        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const userId = getUser(req).id
    const { restaurantId } = req.params
    return Promise.all([Restaurant.findByPk(restaurantId), Like.findOne({ where: { userId, restaurantId } })])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (like) throw new Error('You have liked this restaurant!')
        return Like.create({ userId, restaurantId })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    const userId = getUser(req).id
    return Like.findOne({
      where: { userId, restaurantId: req.params.restaurantId }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this restaurant")
        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }
}

module.exports = userController
