import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import '@playwright/browser-firefox';
import { firefox } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;
const FLAG = process.env.FLAG;
const ADMIN_TOKEN = `admin-${Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)}`;

let users = new Map([
	// ['user', 'test']
]);

app.use(cors());
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let makePost = (content="your rainbow note") => ({
	content,
	seen: false
});

app.use('/', (req, res, next) => {
	if(!req.cookies.sessiontoken) {
		let id = `user-${Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)}`;
		users.set(id, makePost());
		res.cookie('sessiontoken', id);

		req.cookies.sessiontoken = id;
	}
	if(!users.has(req.cookies.sessiontoken)) {
		users.set(req.cookies.sessiontoken, makePost());
	}

	next();
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.use('/', express.static(__dirname + '/public'));

app.use('/debug/api/*', (req, res) => {
	res.send('The debug API is currently down.')
});

app.use('/staging/api/*', (req, res) => {
	res.send('The staging API is currently down.')
});

app.get('/prod/api/posts', (req, res) => {
	if(!req.cookies.sessiontoken) return;
	if(!users.has(req.cookies.sessiontoken)) return;

	let note = users.get(req.cookies.sessiontoken);

	res.json({posts: [note]});
});

app.post('/prod/api/edit_post', (req, res) => {
	if(req.body.post) {
		if(req.body.post.length > 10000) return res.send('too long');
		if(!req.cookies.sessiontoken) return res.send('invalid user session token cookie');

		users.set(req.cookies.sessiontoken, makePost(req.body.post));

		console.log(users);

		res.redirect('/');
	}
});

app.get('/prod/api/premium_posts', (req, res) => {
	const auth = req.query && req.query.token;

	if(auth === ADMIN_TOKEN) {
		res.json({posts: [makePost(`Welcome to Rainbow Posts Premium! Here's your flag: bfe{${FLAG}}`)]});
	} else {
		res.json({posts: [makePost(`You can't see this post because you don't have Rainbow Posts Premium!`)]})
	}
});

async function visitWebPage() {
	const browser = await firefox.launch();
	const context = await browser.newContext();
	const entries = Array.from(users.entries());
	const targetURL = 'http://localhost:' + port + '/';

	context.addCookies([{
		name: 'sessiontoken',
		value: ADMIN_TOKEN,
		url: targetURL
	}]);

	for (const [token, post] of entries) {
		if(post.seen || token === ADMIN_TOKEN) continue;
		post.seen = true;

		const page = await context.newPage();
		console.log('created page');
		await page.goto(targetURL);
		console.log('at page');

		try {
			await page.evaluate(async ({post, ADMIN_TOKEN}) => {
				window.createPost(post);
				await window.loadPosts();
			}, {post, ADMIN_TOKEN});
		} catch(e) {
			console.error(e);
		}

		await sleep(1000);

		console.log('ran code');
		await page.close();
	}

	await context.close();
	await browser.close();
}

async function startReviewingPosts() {
	console.log('Reviewing new posts....', users);
	await visitWebPage();
	console.log('Finished reviewing posts.');
	setTimeout(() => startReviewingPosts(), 10000);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

startReviewingPosts();

app.listen(port, () => {
	console.log('listening on port ' + port);
});