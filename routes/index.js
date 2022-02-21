const express = require('express')
const router = express.Router()

// passport middleware
const passport = require('../config/passport')

// 引用錯誤處理 middleware
const { generalErrorHandler } = require('../middleware/error-handler')
const { authenticated, authenticatedAdmin } = require('../middleware/auth')

const restController = require('../controllers/restaurant-controller')
const userController = require('../controllers/user-controller')
const commentController = require('../controllers/comment-controller')

const admin = require('./modules/admin')
const users = require('./modules/users')

// 管理員
router.use('/admin', authenticatedAdmin, admin)

// 註冊
router.get('/signup', userController.signUpPage)
router.post('/signup', userController.signUp)

// 登入
router.get('/signin', userController.signInPage)
router.post(
  '/signin',
  passport.authenticate('local', {
    failureRedirect: '/signin',
    failureFlash: true
  }),
  userController.signIn
)

// 登出
router.get('/logout', userController.logout)

// 餐廳
router.get('/restaurants', authenticated, restController.getRestaurants)
router.get('/restaurants/top', authenticated, restController.getTopRestaurants)
router.get('/restaurants/feeds', authenticated, restController.getFeeds)
router.get('/restaurants/:id', authenticated, restController.getRestaurant)

// dashboard
router.get('/restaurants/:id/dashboard', authenticated, restController.getDashboard)

// 評論
router.delete('/comments/:id', authenticatedAdmin, commentController.deleteComment)
router.post('/comments', authenticated, commentController.postComment)

// 我的最愛
router.post('/favorite/:restaurantId', authenticated, userController.addFavorite)
router.delete('/favorite/:restaurantId', authenticated, userController.removeFavorite)

// Like
router.post('/like/:restaurantId', authenticated, userController.addLike)
router.delete('/like/:restaurantId', authenticated, userController.removeLike)

// follow
router.post('/following/:userId', authenticated, userController.addFollowing)
router.delete('/following/:userId', authenticated, userController.removeFollowing)

// user
router.use('/users', authenticated, users)

router.get('/', (req, res) => res.redirect('/restaurants'))

// 錯誤處理 middleware
router.use('/', generalErrorHandler)

module.exports = router
