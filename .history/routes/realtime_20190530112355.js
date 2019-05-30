var express = require('express')
var router = express.Router()
import {
    getBusList,
    getDirectionFromBus,
    getRealTimeInfo,
    refresh
} from '../public/javascripts/spiders/realtimebus'

// 获取实时公交信息
router.get('/bus/list', (req, res) => {
    getBusList(req).then(response => {
        res.send(response)
    })
})

router.get('/bus/direction', (req, res) => {
    getDirectionFromBus(req).then(response => {
        res.send(response)
    })
})

// 获取实时公交信息
router.get('/bus/info', (req, res) => {
    getRealTimeInfo(req).then(response => {
        res.send(response)
    })
})

// 刷新实时公交信息
router.get('/bus/refresh', (req, res) => {
    refresh(req).then(response => {
        res.send(response)
    })
})

module.exports = router
