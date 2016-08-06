'use strict'

const fs = require('fs')
const Scraper = require('scraperjs')
const Router = new Scraper.Router()
const Bluebird = require('bluebird')
const argv = require('yargs').argv
const ghpages = require('gh-pages')
const path = require('path')


const baseURL = 'https://cameras.liveviewtech.com/network_cameras/public_live_cameras_video/'
const cameraCount = argv.c || argv.count || 10
const cameraStart = argv.s || argv.start || 0
const concurrency = 3
const cameraTimeout = 5000
const absentMessage = 'No camera at this address'
const fileTitle = '<h1>Cameras</h1>\r'

let cameras = new Array(cameraCount)

const writeFile = Bluebird.promisify(fs.writeFile)

let scrapes = getCameras(cameraCount, {
	cameraStart,
	cameraTimeout,
})
	.then(writeLinkFile)
	.catch(ex => {
		console.log('took too long', ex)
	})
	.then(uploadFile('index.html'))
	.finally(() => process.exit(0))

function getCamera(opts, item, idx) {
	const url = baseURL + (idx + opts.cameraStart)
	const camera = Scraper.StaticScraper.create(url);
	return Bluebird.resolve(camera.scrape(($) => {
		return $("h3").text()
	}))
	.timeout(opts.cameraTimeout)
	.reflect()
	.then((res) => {
		if (res.isRejected()) return
		const val = res.value()

		if (val) console.info(val, idx + opts.cameraStart)
		return val && buildCamera(idx + opts.cameraStart, url, val)
	})
}

function getCameras(count, opts) {
	let cameras = new Array(count).fill(null)
	return Bluebird.all(cameras.map(getCamera.bind(this, opts)))
}

function buildCamera(id, url, title){
	return {
		id,
		url,
		title,
	}
}


function writeLinkFile(cameras){
	const file = cameras
		.filter((camera) => !!camera)
		.reduce((memo, camera, index) => {
			return memo + `
				<span>
				 	${camera.id}: 
				 	<a href="${camera.url}" target="_blank">
				 		${camera.title}
				 	</a>
				</span>
				<br>
		`}, fileTitle)

	return writeFile('index.html', file)
}

function uploadFile(filePath, cb){
	console.log(__dirname)
	ghpages.publish(path.join(__dirname), (err) => {
		console.log(err)
	})
}

