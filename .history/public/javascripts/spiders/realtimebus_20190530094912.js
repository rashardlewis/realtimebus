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
    console.log(keyword)
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
                what: '31',
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
                    const responseBody = JSON.parse(res.text).response.resultset
                    const infoList = responseBody.data.feature.slice(0, 10)
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
                    const response = busList
                    resolve(response)
                }
            })
    })
}

// 根据公交名称获取方向(双向)
export function getDirectionFromBus() {
    return new Promise((resolve, reject) => {
        superagent
            .get(targetUrl)
            .query({
                act: 'getLineDirOption',
                selBLine: '317'
            })
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else {
                    const responseBody = res.text
                    const $ = cheerio.load(responseBody)
                    const directions = $('option')
                        .filter(i => i > 0)
                        .map((i, ele) => $(ele).text())
                        .get()
                    const response = directions
                    resolve(response)
                }
            })
    })
}

// 根据公交名称和当前公交站序号获取实时公交信息
export function getRealTimeInfo(req) {
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
