var express = require('express');
var router = express.Router();
import {
	refreshDataBase,
	getBusList,
	getDirectionFromBus,
	getRealTimeInfo,
	refresh,
	test
} from '../public/javascripts/spiders/realtimebus';

// 同步数据库&北京公交官网中的实时公交列表信息
router.get('/bus/refreshdatabase', (req, res) => {
	refreshDataBase().then(response => {
		res.send(response);
	});
});

// 获取实时公交信息
router.get('/bus/list', (req, res) => {
	getBusList(req).then(response => {
		res.send(response);
	});
});

// 获取公交方向ID
router.get('/bus/direction', (req, res) => {
	getDirectionFromBus(req).then(response => {
		res.send(response);
	});
});

router.get('/bus/test', (req, res) => {
	const response = test();
	console.log('response: ', response);
	response.then(v => res.send(v));
});

// 获取实时公交信息
router.get('/bus/info', (req, res) => {
	getRealTimeInfo(req).then(response => {
		res.send(response);
	});
});

// 刷新实时公交信息
router.get('/bus/refresh', (req, res) => {
	refresh(req).then(response => {
		res.send(response);
	});
});

module.exports = router;
