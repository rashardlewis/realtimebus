import superagent from 'superagent'
import cheerio from 'cheerio'
// import iconv from 'iconv-lite'
require('superagent-charset')(superagent)

const targetUrl = 'http://www.bjbus.com/home/ajax_rtbus_data.php'

// 根据关键词获取公交列表
export function getBusList(req) {
    const {
        query: { keyword }
    } = req
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
                    reject(err)
                } else {
                    const response = JSON.parse(res.text).response
                    let result = {
                        data: [],
                        status: {
                            code: 200,
                            message: ''
                        },
                        success: true
                    }
                    if (response && response.hasOwnProperty('error')) {
                        // 查询成功，但未找到任何信息
                        result['status'] = {
                            code: response.error.id,
                            message: response.error.msg || '失败'
                        }
                    } else if (
                        response &&
                        response.hasOwnProperty('resultset')
                    ) {
                        // 查询成功，返回busList
                        const responseBody = response.resultset
                        let infoList = responseBody.data.feature
                        infoList = Array.isArray(infoList)
                            ? infoList.slice(0, 10)
                            : [infoList]
                        const busList = infoList.map(v => {
                            const busName = v.caption.substring(
                                0,
                                v.caption.indexOf('(')
                            )
                            const direction = v.caption.match(/\(([^)]*)\)/)[1]
                            return {
                                busName,
                                direction
                            }
                        })
                        result['data'] = busList
                    } else {
                        result['status'] = {
                            code: '400',
                            message: '未知'
                        }
                    }
                    resolve(result)
                }
            })
    })
}

// 根据公交名称获取方向(双向)
export function getDirectionFromBus(req) {
    const {
        query: { busName, direction }
    } = req
    return new Promise((resolve, reject) => {
        superagent
            .get(targetUrl)
            .query({
                act: 'getLineDirOption',
                selBLine: busName
            })
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else {
                    let result = {
                        data: {},
                        status: {
                            code: 200,
                            message: ''
                        },
                        success: true
                    }
                    const responseBody = res.text
                    const $ = cheerio.load(responseBody)
                    const directions = $('option')
                        .filter(i => i > 0)
                        .map((i, ele) => ({
                            id: Number($(ele).attr('value')),
                            name: $(ele).text()
                        }))
                        .get()
                    const station = directions.find(
                        v => v.name.indexOf(direction) !== -1
                    )
                    if (station) {
                        result['data']['id'] = station.id
                    } else {
                        result['status'] = {
                            code: 400,
                            message: '未找到该方向ID'
                        }
                        result['success'] = false
                    }
                    resolve(result)
                }
            })
    })
}

// 根据公交名称和当前公交站序号获取实时公交信息
export function getRealTimeInfo(req) {
    const {
        query: { busName, directionId, staionIndex }
    } = req
    return new Promise((resolve, reject) => {
        superagent
            .get(targetUrl)
            .query({
                act: 'busTime',
                selBLine: busName,
                selBDir: directionId,
                selBStop: staionIndex
            })
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else {
                    const responseBody = JSON.parse(res.text)
                    const $ = cheerio.load(responseBody['html'])
                    const busName = $('h3#lh').text()
                    const direction = $('h2#lm').text()
                    const stationInfo = {
                        standardInfo: $('.inquiry_header article p')
                            .eq(0)
                            .text(),
                        currentInfo: $('.inquiry_header article p')
                            .eq(1)
                            .text()
                    }
                    const stationList = $('#cc_stop ul li span')
                        .map((i, ele) => $(ele).attr('title'))
                        .get()
                    const busList = $('#cc_stop ul li')
                        .map((i, ele) => {
                            return (
                                $(ele)
                                    .find('i')
                                    .attr('class') || ''
                            )
                        })
                        .get()
                    const response = {
                        code: 200,
                        data: {
                            busName,
                            direction,
                            stationInfo,
                            stationList,
                            busList,
                            currentBusCount: Number(responseBody['seq'])
                        },
                        status: 'success'
                    }
                    resolve(response)
                }
            })
    })
}

// 刷新
export function refresh(req) {
    return new Promise((resolve, reject) => {
        superagent
            .get(targetUrl)
            .query({
                act: 'busTime',
                selBLine: '317',
                selBDir: '4895033067452418567',
                selBStop: '7'
            })
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else {
                    const responseBody = JSON.parse(res.text)
                    const $ = cheerio.load(responseBody['html'])
                    const stationInfo = {
                        standardInfo: $('.inquiry_header article p')
                            .eq(0)
                            .text(),
                        currentInfo: $('.inquiry_header article p')
                            .eq(1)
                            .text()
                    }
                    const busList = $('#cc_stop ul li')
                        .map((i, ele) => {
                            return (
                                $(ele)
                                    .find('i')
                                    .attr('class') || ''
                            )
                        })
                        .get()
                    const response = {
                        code: 200,
                        data: {
                            stationInfo,
                            busList,
                            currentBusCount: Number(responseBody['seq'])
                        },
                        status: 'success'
                    }
                    resolve(response)
                }
            })
    })
}
