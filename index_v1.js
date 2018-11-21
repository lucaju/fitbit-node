/*jshint esversion: 6 */
/*eslint no-console: ["error", { allow: ["log", "error"] }] */

// FITBIT API RATE LIMIT: 150/HOUR


//------ MODULES
const fs = require('fs');
const express = require("express");
const opn = require('opn');

const moment = require("moment");
const jsonfile = require('jsonfile');
// const csvdata = require('csvdata');
const colors = require('colors');
const logSymbols = require('log-symbols');
const util = require('util');



//------ INITIALIZE VARIABLES AND PARAMETERS
//initialize the express application
const app = express();
app.listen(3000);

// initialize the Fitbit API client
const FitbitApiClient = require("fitbit-node");
const client = new FitbitApiClient({
	clientId: "22CZ5P",
	clientSecret: "8fc7266a6ef29d1425b132c60264e17c",
	apiVersion: "1.2" // 1.2 is the default
});

const callbackUrl = "http://127.0.0.1:3000/callback";
var token = "";

const dataset = [];


// let heartData = [];


//DATE
const startDate = moment("2018-07-09");
const duration = moment.duration(3, 'days');
// const duration = moment.duration(13, 'days');
// let const = moment("2018-07-21");




// ---- INTIALIZE
function init() {

	//set dates to collect data
	
	let iDay = startDate;

	for (let i=0; i < duration.days(); i++) {

		let d = iDay.format("YYYY-MM-DD");

		//create data model per day
		let day = {
			date: d,
			data: {
				heart: [],
				sleep: [],
				steps: [],
				distance: [],
				calories: []
			}

		};

		dataset.push(day);
	
		//advance day
		iDay = moment(iDay.add(1,"d"));
	}

	//start
	opn('http://127.0.0.1:3000/authorize', {app: 'google chrome'});
} 


//------ AUTHORIZATION
// redirect the user to the Fitbit authorization page
app.get("/authorize", (req, res) => {
	// request access to the user's activity, heartrate, location, nutrion, profile, settings, sleep, social, and weight scopes
	res.redirect(client.getAuthorizeUrl("activity heartrate location nutrition profile settings sleep social weight", callbackUrl));
});


//------ CALLBACK
//handle the callback from Fitbit authorization flow
app.get("/callback", (req, res) => {

	//exchange the authorization code we just reeived for the access token
	client.getAccessToken(req.query.code, callbackUrl).then(result => {

		console.log("Connected!".underline);
		console.log(`++++++++++++++`.dim);
		console.log("");

		//save token and get data
		token = result.access_token;

		getData()
			.then(() => {
				// console.log(util.inspect(dataset, {depth: null}));
				// console.log(dataset);

				res.json(dataset);

				console.log("");
				console.log("Done!");
				console.log("");
				console.log("Disconected!".underline);
				console.log(`++++++++++++++`.dim);
				process.exit(0);
			});

	}).catch(err => {
		res.status(err.status).send(err);
	});
});


function getData() {

	return new Promise(
		(resolve,reject) => {

			console.log(`Getting Hearrate data`.blue);
			return Promise.all(dataset.map(getHeaRatetByDay))
				.then(function(result) {
					console.log("");
					console.log(`Getting Sleep data`.blue);
					return Promise.all(dataset.map(getSleepByDay));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Steps data`.blue);
					return Promise.all(dataset.map(getStepspByDay));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Distance data`.blue);
					return Promise.all(dataset.map(getDistanceByDay));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Calories data`.blue);
					return Promise.all(dataset.map(getCaloriesByDay));
				})
				.then(function(result) {
					resolve(dataset);
				})
				.catch(function(err) {
					reject(err);
				});

		});

}


function getHeaRatetByDay(item) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			client.get(`/activities/heart/date/${day}/1d.json`, token)
				.then(results => {

					//save data
					item.data.heart.push(results[0]);

					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");

					return results[0];

				})
				.then(result => {
					//generate JSON
					return getJson(day,"heart",result);
				})
				.then(function() {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
}

function getSleepByDay(item) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			client.get(`/sleep/date/${day}.json`, token)
				.then(results => {

					//save data
					item.data.sleep.push(results[0]);

					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");

					return results[0];

				})
				.then(result => {
					//generate JSON
					return getJson(day,"sleep",result);
				})
				.then(function() {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});

}

function getStepspByDay(item) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			client.get(`/activities/steps/date/${day}/1d.json`, token)
				.then(results => {

					//save data
					item.data.steps.push(results[0]);

					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");

					return results[0];

				})
				.then(result => {
					//generate JSON
					return getJson(day,"steps",result);
				})
				.then(function() {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
}

function getDistanceByDay(item) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			client.get(`/activities/distance/date/${day}/1d.json`, token)
				.then(results => {

					//save data
					item.data.distance.push(results[0]);

					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");

					return results[0];

				})
				.then(result => {
					//generate JSON
					return getJson(day,"distance",result);
				})
				.then(function() {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
}

function getCaloriesByDay(item) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			client.get(`/activities/calories/date/${day}/1d.json`, token)
				.then(results => {

					//save data
					item.data.calories.push(results[0]);

					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");

					return results[0];

				})
				.then(result => {
					//generate JSON
					return getJson(day,"calories",result);
				})
				.then(function() {
					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
}



//get JSON
function getJson(day,metric,data) {

	return new Promise(
		(resolve, reject) => {

			const folder = `./results/${metric}`;

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			const file = `fitbit-${metric}-${day}.json`;

			jsonfile.writeFile(`${folder}/${file}`, data, {spaces: 4}, function (err) {
				if (err) {
					console.log(err);
				} else {
					console.log("  Saved to Json file".green);
					resolve();
				}
			});

		});

}


// launch the server
init();



// 