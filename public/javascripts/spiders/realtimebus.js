import superagent from 'superagent';
import cheerio from 'cheerio';
import { Models } from '../../database/mongodb';
require('superagent-charset')(superagent);

const targetUrl = 'http://www.bjbus.com/home/ajax_rtbus_data.php';

export function refreshDataBase() {
	return new Promise((resolve, reject) => {
		superagent.get('http://www.bjbus.com/home').end((err, res) => {
			if (err) {
				reject(err);
			} else {
				const html = res.text;
				const $ = cheerio.load(html);
				const result = {
					html: $('.items_cont .items .item tr .row2 #selBLine a')
						.map((bi, bus) => $(bus).text())
						.get()
				};
				const insertData = result.html.map(bus => {
					return {
						name: bus,
						type: 'bus'
					};
				});
				Models.realtimelist.deleteMany({}, () => {
					Models.realtimelist.insertMany(insertData, (err, docs) => {
						if (err) reject(err);
						else resolve(docs);
					});
				});
			}
		});
	});
}

// 根据关键词获取公交列表
export function getBusList(req) {
	const {
		query: { keyword }
	} = req;
	return new Promise((resolve, reject) => {
		superagent
			.get('http://api.go2map.com/engine/api/businfo/json')
			.charset('gbk')
			.set({
				'Content-Type': 'text/html;charset=utf-8',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
				'Accept-Encoding': 'gzip, deflate',
				'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
			})
			.query({
				hidden_MapTool: 'busex2.BusInfo',
				what: keyword || '',
				city: '北京市',
				pageindex: '1',
				pagesize: '10',
				fromuser: 'bjbus',
				datasource: 'bjbus',
				clientid: '9db0f8fcb62eb46c'
				// cb: 'SGS.modules_businfo16afe6b421b10'
			})
			.end((err, res) => {
				if (err) {
					reject(err);
				} else {
					const response = JSON.parse(res.text).response;
					let result = {
						data: [],
						status: {
							code: 200,
							message: ''
						},
						success: true
					};
					if (response && response.hasOwnProperty('error')) {
						// 查询成功，但未找到任何信息
						result['status'] = {
							code: response.error.id,
							message: response.error.msg || '失败'
						};
						resolve(result);
					} else if (response && response.hasOwnProperty('resultset')) {
						// 查询成功，返回busList
						const responseBody = response.resultset;
						let infoList = responseBody.data.feature;
						infoList = Array.isArray(infoList)
							? infoList.slice(0, 10)
							: [infoList];
						const busList = infoList
							.map(v => {
								let busName;
								if (v.caption.indexOf('(') !== 0) {
									busName = v.caption.substring(0, v.caption.indexOf('('));
								} else {
									busName = c.caption;
								}
								const directionInfo = v.caption.match(/\(([^)]*)\)/);
								let direction;
								if (directionInfo) direction = directionInfo[1];
								if (busName && direction) {
									return {
										busName,
										direction
									};
								}
							})
							.filter(v => v !== null && v !== undefined);
						if (!busList) {
							result['status']['message'] =
								'抱歉,没有找到任何与所输关键词相关的信息!';
							resolve(result);
						} else {
							const queryItem = {
								name: { $regex: keyword } // $regex 正则匹配已进行模糊搜索
							};
							Models.realtimelist.find(queryItem, (error, docs) => {
								const dbResult = docs.map(item => item.name);
								const finalResult = busList.filter(item =>
									dbResult.find(name => item.busName === name)
								);
								result['data'] = finalResult;
								resolve(result);
							});
						}
					} else {
						result['status'] = {
							code: '400',
							message: '未知'
						};
						resolve(result);
					}
				}
			});
	});
}

// 根据关键词获取公交列表
// export function getBusList(req) {
// 	const {
// 		query: { keyword }
// 	} = req;
// 	return new Promise((resolve, reject) => {
// 		const queryItem = {
// 			name: { $regex: keyword } // $regex 正则匹配已进行模糊搜索
// 		};
// 		let result = {
// 			data: [],
// 			status: {
// 				code: 200,
// 				message: ''
// 			},
// 			success: true
// 		};
// 		Models.realtimelist.find(queryItem, (err, docs) => {
// 			if (err) {
// 				// 查询成功，但未找到任何信息
// 				result['status'] = {
// 					code: 200,
// 					message: err || '失败'
// 				};

// 				reject(result);
// 			} else {

//       }resolve(docs);
// 		});
// 	});
// }

// 根据公交名称获取方向(双向)
export function getDirectionFromBus(req) {
	const {
		query: { busName, direction }
	} = req;
	return new Promise((resolve, reject) => {
		superagent
			.get(targetUrl)
			.query({
				act: 'getLineDirOption',
				selBLine: busName
			})
			.end((err, res) => {
				if (err) {
					reject(err);
				} else {
					let result = {
						data: {},
						status: {
							code: 200,
							message: ''
						},
						success: true
					};
					const responseBody = res.text;
					const $ = cheerio.load(responseBody);
					const directions = $('option')
						.filter(i => i > 0)
						.map((i, ele) => ({
							id: $(ele).attr('value'),
							name: $(ele).text()
						}))
						.get();
					const station = directions.find(
						v => v.name.indexOf(direction) !== -1
					);
					if (station) {
						result['data']['id'] = station.id;
						getStationsFromBus({
							query: {
								busName,
								direction: station.id
							}
						}).then(s => {
							result['data']['stations'] = s;
							resolve(result);
						});
					} else {
						result['status'] = {
							code: 400,
							message: '未找到该方向ID'
						};
						result['success'] = false;
						resolve(result);
					}
				}
			});
	});
}

// 根据公交方向获取车站列表
export function getStationsFromBus(req) {
	const {
		query: { busName, direction }
	} = req;
	return new Promise((resolve, reject) => {
		superagent
			.get(targetUrl)
			.query({
				act: 'getDirStationOption',
				selBLine: busName,
				selBDir: direction
			})
			.end((err, res) => {
				if (err) {
					reject(err);
				} else {
					let result = {
						data: {},
						status: {
							code: 200,
							message: ''
						},
						success: true
					};
					const responseBody = res.text;
					const $ = cheerio.load(responseBody);
					const directions = $('option')
						.filter(i => i > 0)
						.map((i, ele) => $(ele).text())
						.get();
					resolve(directions);
				}
			});
	});
}

// 根据公交名称和当前公交站序号获取实时公交信息
export function getRealTimeInfo(req) {
	const {
		query: { busName, directionId, stationIndex }
	} = req;
	return new Promise((resolve, reject) => {
		superagent
			.get(targetUrl)
			.query({
				act: 'busTime',
				selBLine: String(busName),
				selBDir: String(directionId),
				selBStop: String(stationIndex)
			})
			.end((err, res) => {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					let result = {
						data: {},
						status: {
							code: 200,
							message: ''
						},
						success: true
					};
					const responseBody = JSON.parse(res.text);
					const $ = cheerio.load(responseBody['html']);
					const busRealName = $('h3#lh').text();
					const direction = $('h2#lm').text();
					const stationInfo = {
						standardInfo: $('.inquiry_header article p')
							.eq(0)
							.text(),
						currentInfo: $('.inquiry_header article p')
							.eq(1)
							.text()
					};
					const stationList = $('#cc_stop ul li span')
						.map((i, ele) => $(ele).attr('title'))
						.get();
					const busList = $('#cc_stop ul li')
						.map((i, ele) => {
							return (
								$(ele)
									.find('i')
									.attr('class') || ''
							);
						})
						.get();
					result['data'] = {
						busRealName,
						direction,
						stationInfo,
						stationList,
						busList
					};
					resolve(result);
				}
			});
	});
}

// 刷新
export function refresh(req) {
	const {
		query: { busName, directionId, stationIndex }
	} = req;
	return new Promise((resolve, reject) => {
		superagent
			.get(targetUrl)
			.query({
				act: 'busTime',
				selBLine: String(busName),
				selBDir: String(directionId),
				selBStop: String(stationIndex)
			})
			.end((err, res) => {
				if (err) {
					reject(err);
				} else {
					const responseBody = JSON.parse(res.text);
					const $ = cheerio.load(responseBody['html']);
					const stationInfo = {
						standardInfo: $('.inquiry_header article p')
							.eq(0)
							.text(),
						currentInfo: $('.inquiry_header article p')
							.eq(1)
							.text()
					};
					const busList = $('#cc_stop ul li')
						.map((i, ele) => {
							return (
								$(ele)
									.find('i')
									.attr('class') || ''
							);
						})
						.get();
					const response = {
						code: 200,
						data: {
							stationInfo,
							busList
						},
						status: 'success'
					};
					resolve(response);
				}
			});
	});
}

export async function test() {
	const here = await new Promise((resolve, reject) => {
		superagent
			.get(targetUrl)
			.query({
				act: 'getLineDirOption',
				selBLine: '317'
			})
			.end((err, res) => {
				if (err) {
					console.log('error');
					console.log('--------------');
					reject('error');
				} else {
					console.log('success');
					console.log('--------------');
					const responseBody = res.text;
					const $ = cheerio.load(responseBody);
					const directions = $('option')
						.filter(i => i > 0)
						.map((i, ele) => ({
							id: $(ele).attr('value'),
							name: $(ele).text()
						}))
						.get();
					resolve('res.text');
				}
			});
	});
	console.log('await: ', here);
	return here;
}
