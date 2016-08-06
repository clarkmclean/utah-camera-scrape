'use strict'

const fs = require('fs')
const Scraper = require('scraperjs')
const Router = new Scraper.Router()
const Bluebird = require('bluebird')
const argv = require('yargs').argv
const ghpages = require('gh-pages')
const path = require('path')
const TimeoutError = Bluebird.TimeoutError


// const baseURL = 'https://cameras.liveviewtech.com/network_cameras/public_live_cameras_video/'
const baseURL = 'https://www.rcwilley.com/?q='

const cameraCount = argv.c || argv.count || 1000
const cameraStart = argv.s || argv.start || 4000000
const concurrency = 1000
const cameraTimeout = 10000
const absentMessage = 'No camera at this address'
const fileTitle = '<h1>Cameras</h1>\r'
const query = 'h1'

let cameras = new Array(cameraCount)

const writeFile = Bluebird.promisify(fs.writeFile)

let scrapes = getCameras(cameraCount, {
	cameraStart,
	cameraTimeout,
	concurrency,
	query
})
	.then(writeLinkFile)
	.then(uploadFile)
	.catch(ex => {
		console.error('Unhandled exception', ex)
	})
	.finally(() => process.exit(0))

function getCamera(opts, item, idx) {
	console.log('get item', idx)
	const url = baseURL + (idx + opts.cameraStart)
	const camera = Scraper.StaticScraper.create(url);
	return Bluebird.resolve(camera.scrape(($) => {
		return $(opts.query).text()
	}))
	.timeout(opts.cameraTimeout)
	.then((val) => {
		if (val) console.info(val, idx + opts.cameraStart)
		return val && buildCamera(idx + opts.cameraStart, url, val)
	})
	.catch(TimeoutError, (ex) => {
		console.warn('Promise timed out.')
	})
}

function getCameras(count, opts) {
	let cameras = new Array(count).fill(null)
	return Bluebird.map(cameras, getCamera.bind(this, opts), {concurrency: opts.concurrency})
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

function uploadFile(){
	return Bluebird.fromCallback(cb => ghpages.publish(path.join(__dirname), cb))
}

