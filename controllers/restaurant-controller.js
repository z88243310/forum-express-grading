const { Restaurant, Category, Comment, User } = require('../models')
const { getOffset, getPagination } = require('../helpers/pagination-helper')
const { getUser } = require('../helpers/auth-helpers')
const Sequelize = require('sequelize')

const restaurantController = {
  getRestaurants: (req, res, next) => {
    const user = getUser(req)
    const categoryId = Number(req.query.categoryId) || ''
    const DEFAULT_LIMIT = 9
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || DEFAULT_LIMIT
    const offset = getOffset(limit, page)

    return Promise.all([
      Restaurant.findAndCountAll({
        include: Category,
        where: { ...(categoryId ? { categoryId } : {}) },
        limit,
        offset,
        nest: true,
        raw: true
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        const favoritedRestaurantsId = user && user.FavoritedRestaurants.map(fr => fr.id)
        const likedRestaurantsId = user && user.LikedRestaurants.map(lr => lr.id)
        const data = restaurants.rows.map(restaurant => ({
          ...restaurant,
          description: restaurant.description.substring(0, 50),
          isFavorited: favoritedRestaurantsId.includes(restaurant.id),
          isLiked: likedRestaurantsId.includes(restaurant.id)
        }))
        return res.render('restaurants', {
          restaurants: data,
          categories,
          categoryId,
          pagination: getPagination(limit, page, restaurants.count)
        })
      })
      .catch(err => next(err))
  },
  getRestaurant: (req, res, next) => {
    const userId = getUser(req).id
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers', where: { id: userId }, required: false },
        { model: User, as: 'LikedUsers', where: { id: userId }, required: false }
      ],
      attributes: {
        include: [
          [Sequelize.fn('', Sequelize.col('FavoritedUsers.id')), 'isFavorited'],
          [Sequelize.fn('', Sequelize.col('LikedUsers.id')), 'isLiked']
        ]
      },
      order: [[{ model: Comment }, 'createdAt', 'DESC']],
      nest: true
    })
      .then(restaurant => {
        if (!restaurant) throw new Error('餐廳不存在')
        return restaurant.increment('viewCounts')
      })
      .then(restaurant => {
        restaurant = restaurant.toJSON()
        res.render('restaurant', { restaurant })
      })
      .catch(err => next(err))
  },
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [Category, Comment, { model: User, as: 'FavoritedUsers' }, { model: User, as: 'LikedUsers' }],
      nest: true
    })
      .then(restaurant => {
        if (!restaurant) throw new Error('餐廳不存在')
        res.render('dashboard', { restaurant: restaurant.toJSON() })
      })
      .catch(err => next(err))
  },
  getFeeds: (req, res, next) => {
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [User, Restaurant],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => {
        res.render('feeds', {
          restaurants,
          comments
        })
      })
      .catch(err => next(err))
  },
  getTopRestaurants: (req, res, next) => {
    const user = getUser(req)
    return Restaurant.findAll({ include: [{ model: User, as: 'FavoritedUsers' }] }).then(rawRestaurants => {
      const favoritedRestaurantsId = user && user.FavoritedRestaurants.map(fr => fr.id)
      const restaurants = rawRestaurants
        .map(rawRestaurant => ({
          ...rawRestaurant.toJSON(),
          favoritedCount: rawRestaurant.FavoritedUsers.length,
          isFavorited: favoritedRestaurantsId?.includes(rawRestaurant.id)
        }))
        .sort((a, b) => b.favoritedCount - a.favoritedCount)
        .slice(0, 10)
      res.render('top-restaurants', { restaurants })
    })
  }
}

module.exports = restaurantController
