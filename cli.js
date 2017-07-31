#!/usr/bin/env node

'use strict';

const os = require('os');
const dns = require('dns');
const https = require('https');
const fs = require('fs');
const fse = require('fs-extra');
const got = require('got');
const cheerio = require('cheerio');
const ora = require('ora');
const chalk = require('chalk');
const logUpdate = require('log-update');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');

updateNotifier({pkg}).notify();

const pre = chalk.cyan.bold('›');
const pos = chalk.red.bold('›');
const arg = process.argv[2];
const inf = process.argv[3];
const indexDir = `${os.homedir()}/wikipics/`;
const url = `https://en.wikipedia.org/wiki/Template:POTD`;
const spinner = ora();

if (!arg || arg === '-h' || arg === '--help') {
	console.log(`
 Usage: wikipics <command> [date]

 Commands:
  -t, ${chalk.dim('--today')}   Downlaod Wikipedia Picture of the Day
  -d, ${chalk.dim('--date')}    Download Wikipedia Picture of the Day of a specific date

 Example:
  $ wikipics -t ${chalk.dim('[--today]')}
  $ wikipics -d ${chalk.dim('[--date ]')} 2016-10-10

 Date Format: yy-mm-dd
 `);
	process.exit(1);
}

const connection = () => {
	dns.lookup('wikipedia.org', err => {
		if (err) {
			logUpdate(`\n${pos} Please check your Internet Connection\n`);
			process.exit(1);
		} else {
			logUpdate();
			spinner.text = `Please wait...`;
			spinner.start();
		}
	});
};

fse.ensureDir(indexDir, err => {
	if (err) {
		process.exit(1);
	}
});

const download = (imageSource, fileName, data, stamp) => {
	stamp = stamp || `${new Date().toISOString().substr(0, 10)}`;

	const baseDir = `${os.homedir()}/wikipics/${stamp}/`;

	fse.ensureDir(baseDir, err => {
		if (err) {
			process.exit(1);
		}
	});

	const file = `${baseDir}/${stamp}`;
	const buffer = Buffer.from(data);
	const save = fs.createWriteStream(`${baseDir}/${fileName}`);

	const stream = fs.createWriteStream(file);

	stream.once('open', () => {
		stream.write(buffer);
		stream.end();
	});

	https.get(imageSource, (res, cb) => {
		res.pipe(save);

		save.on('finish', () => {
			save.close(cb);
			logUpdate(`\n${pre} Image Saved  ${chalk.dim(`[${fileName}]`)}\n`);
			spinner.stop();

			save.on('error', () => {
				process.exit(1);
			});
		});
	});
};

const downloadMessage = () => {
	logUpdate();
	spinner.text = 'Downloading. Hold on!';
};

if (arg === '-t' || arg === '--today') {
	connection();
	got(url).then(res => {
		downloadMessage();
		const $ = cheerio.load(res.body);
		const imgSource = `https:${$('img').eq(1).attr('src').replace('/thumb', '').split("/").slice(0, -1).join("/")}`;
		const imgName = imgSource.split('/').slice(-1)[0];
		const imgData = $('.mw-body-content p').eq(0).text();

		download(imgSource, imgName, imgData);
	});
}

if (arg === '-d' || arg === '--date') {
	if (!inf) {
		logUpdate(`\n${pos} Please provide a valid date! \n`);
		process.exit(1);
	}
	connection();
	got(`${url}/${inf}`).then(res => {
		downloadMessage();
		const $ = cheerio.load(res.body);
		const imgSource = `https:${$('img').attr('src').replace('/thumb', '').split("/").slice(0, -1).join("/")}`;

		const imgName = imgSource.split('/').slice(-1)[0];
		const imgData = $('.mw-body-content p').eq(0).text();

		download(imgSource, imgName, imgData, inf);
	}).catch(err => {
		if (err) {
			logUpdate(`\n${pos} Dry day! Couldn't find any image. \n`);
			process.exit(1);
		}
	});
}
