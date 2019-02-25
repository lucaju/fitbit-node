/*jshint esversion: 6 */
/*eslint no-console: ["error", { allow: ["log", "error"] }] */

// FITBIT API RATE LIMIT: 150/HOUR


//------ MODULES
const fs = require('fs');
const express = require("express");
const opn = require('opn');

const moment = require("moment");
const jsonfile = require('jsonfile');
const csvdata = require('csvdata');
const colors = require('colors');
const logSymbols = require('log-symbols');
// const util = require('util');



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
const duration = moment.duration(13, 'days');
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
	// const loadPromise = new Promise(
		(resolve,reject) => {

			console.log(`Getting Heart data`.blue);
			return Promise.all(dataset.map(item => { return getDataMetricByDay(item,"heart");} ))
				.then(function(result) {
					console.log("");
					console.log(`Getting Sleep data`.blue);
					return Promise.all(dataset.map(item => { return getDataMetricByDay(item,"sleep");} ));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Steps data`.blue);
					return Promise.all(dataset.map(item => { return getDataMetricByDay(item,"steps");} ));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Distance data`.blue);
					return Promise.all(dataset.map(item => { return getDataMetricByDay(item,"distance");} ));
				})
				.then(function(result) {
					console.log("");
					console.log(`Getting Calories data`.blue);
					return Promise.all(dataset.map(item => { return getDataMetricByDay(item,"calories");} ));
				})
				.then(function(result) {
					resolve(dataset);
				})
				.catch(function(err) {
					reject(err);
				});

		});

}

function getDataMetricByDay(item,metric) {
	return new Promise(
		(resolve, reject) => {

			const day = item.date;

			let path = `/activities/${metric}/date/${day}/1d.json`;
			if(metric == "sleep") path = `/${metric}/date/${day}.json`;

			client.get(path, token)
				.then(results => {
					//save data
					item.data[metric].push(results[0]);
					console.log(`> ${day}`);
					console.log(logSymbols.success,"Data collected.");
					return results[0];
				})
				.then(result => {
					//generate JSON
					return saveToJson(day,metric,result);
				})
				.then(result => {
					//generate CSV
					return saveToCSV(day,metric,result);
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
function saveToJson(day,metric,data) {

	return new Promise(
		(resolve, reject) => {

			const folder = `./results/json/metrics/${metric}`;

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			const file = `fitbit-${metric}-${day}.json`;

			jsonfile.writeFile(`${folder}/${file}`, data, {spaces: 4}, function (err) {
				if (err) {
					// console.log(err);
				} else {
					console.log("  Saved to Json file".green);
					resolve(data);
				}
			});

		});

}

//get JSON
function saveToCSV(day,metric,data) {

	let dataEssential = {};
	let header = "";
			

	//strip data to essentials

	switch (metric) {

	case "heart":
		dataEssential = data["activities-heart-intraday"].dataset;
		header = 'time,value';
		break;
	
	case "sleep":
		if(data.sleep.length > 0) {
			dataEssential = data.sleep[0].levels.data;
			header = 'dateTime,level,seconds';
		} else {
			dataEssential = null;
		}
		break;

	case "steps":
		dataEssential = data["activities-steps-intraday"].dataset;
		header = 'time,value';
		break;

	case "distance":
		dataEssential = data["activities-distance-intraday"].dataset;
		header = 'time,value';
		break;

	case "calories":
		dataEssential = data["activities-calories-intraday"].dataset;
		header = 'level,mets,time,value';
		break;

	}
	

	return new Promise(
		(resolve, reject) => {

			if (dataEssential == null) {
				console.log("  No data to save to CSV file".red);
				resolve();
				return;
			}

			const folder = `./results/csv/metrics/${metric}`;

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			const file = `fitbit-${metric}-${day}.csv`;

			//body
			let options = {
				// append: false,
				delimiter: ',',
				header: header,
				log: false
			};

			csvdata.write(`${folder}/${file}`, dataEssential, options);

			console.log("  Saved to CSV file".cyan);
			resolve();

		});

}


// launch the server
init();
