'use strict'

const fs = require('fs')
const Scraper = require('scraperjs')
const Router = new Scraper.Router()
const Bluebird = require('bluebird')

Bluebird.config({
	cancellation: true
})

const baseURL = 'https://cameras.liveviewtech.com/network_cameras/public_live_cameras_video/'
const cameraCount = 100
const concurrency = 3
const cameraTimeout = 5000
const absentMessage = 'No camera at this address'
const fileTitle = '<h1>Cameras</h1>\r'

let cameras = new Array(cameraCount)




let scrapes = getCameras().then((blah) => {
	Bluebird.all(blah).then(() => {
		writeLinkFile(cameras)
		// process.exit(0)
	})
});




function getCameras() {
	return Bluebird.map(cameras, (item, index) => {
		let camera, cameraPromise, url = baseURL + index

		camera = Scraper.StaticScraper.create(url)
		cameraPromise = Bluebird.resolve(camera).reflect()

			camera.scrape(($) => {
				return $("h3").text()
			})
			.then((title, utils) => {
				console.log(index, title || absentMessage)
				cameras[index] = buildCamera(index, url, title || absentMessage)
			})
			.catch((err) => {
				console.log('failed', err)
			})

			setTimeout(() => {
				if(!cameraPromise.isFulfilled()) {
					console.log('reached request timeout.... canceling')
					cameraPromise.cancel('sucked')
				} 
			}, cameraTimeout)

		return cameraPromise;

	}, {concurrency: concurrency})
}

function buildCamera(index, url, title){
	return {
		"id" : index,
		"url" : url,
		"title" : title
	}
}

function writeLinkFile(cameras){
	Bluebird.map(cameras, (camera, index) => {
		if(camera) return '<span>' + camera.id + ': <a href="' + camera.url + '" target="_blank">' + camera.title + '</a></span>'; 		
	}).then((links) => {
		let file = fileTitle + links.join('<br/>\r')
		fs.writeFile('index.html', file, (err) => {
			if(err) throw err;
			console.log('saved file')
		})
	})
}
// console.log('scrape', scrape);
// .then(() => console.log(cameras))


// process.exit(0)